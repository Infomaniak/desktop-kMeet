try {
  $whoami = $MyInvocation.MyCommand

  # Verify that all required environment variables are set
  $required = @(
    'SM_API_KEY',
    'SM_TOOLS_URI',
    'SM_KEYPAIR_ALIAS',
    'SM_CLIENT_CERT_FILE_B64',
    'SM_CLIENT_CERT_FILE',
    'SM_CLIENT_CERT_PASSWORD',
    'SM_HOST',
    'SM_CODE_SIGNING_CERT_SHA1_HASH'
  )
  foreach ($variable in $required) {
    if (!$(Test-Path "env:$variable")) {
      throw "Unable to sign files because $variable is not set in the environment."
    }
  }

  # Idempotency: when SM Tools are already installed (second invocation in
  # the same job, or a rerun), skip the ~118 MB download and the install.
  $smctlExe = "C:\Program Files\DigiCert\DigiCert One Signing Manager Tools\smctl.exe"
  if (Test-Path $smctlExe) {
    Write-Host "[$whoami] SM Tools already installed, skipping download/install."
  } else {
    # Download SM Tools with retries: a truncated or HTML response used to
    # produce an invalid msi and a cryptic msiexec exit code 1620. A valid
    # MSI always starts with the OLE compound file magic d0cf11e0a1b11ae1.
    $downloaded = $false
    foreach ($attempt in 1..3) {
      Write-Host "[$whoami] Downloading SM Tools (attempt $attempt/3)..."
      $params = @{
        Method  = 'Get'
        Headers = @{
          'x-api-key' = $env:SM_API_KEY
        }
        Uri     = $env:SM_TOOLS_URI
        OutFile = 'smtools.msi'
      }
      Invoke-WebRequest @params
      $fs = [System.IO.File]::OpenRead('smtools.msi')
      $headerBytes = New-Object byte[] 8
      $null = $fs.Read($headerBytes, 0, 8)
      $fs.Close()
      $magic = ($headerBytes | ForEach-Object { $_.ToString('x2') }) -join ''
      if ($magic -eq 'd0cf11e0a1b11ae1') {
        $downloaded = $true
        break
      }
      Write-Warning "[$whoami] smtools.msi is not a valid MSI (magic=$magic), retrying..."
      if ($attempt -lt 3) { Start-Sleep -Seconds (5 * $attempt) }
    }
    if (-not $downloaded) {
      throw "SM Tools download failed after 3 attempts (invalid MSI payload, magic=$magic)"
    }

    Write-Host "[$whoami] Installing SM Tools..."
    $process = Start-Process msiexec.exe -ArgumentList "/i", "smtools.msi", "/quiet", "/qn" -PassThru -Wait
    if ($process.ExitCode -ne 0 -and $process.ExitCode -ne 3010) {
      throw "SM Tools installation failed with exit code $($process.ExitCode)"
    }
  }

  # Create certificate file holder (-Force: idempotent across invocations)
  Write-Host "[$whoami] Creating certificate file holder..."
  New-Item C:\Certificate.p12.b64 -Force | Out-Null

  Write-Host "[$whoami] Setting certificate file content..."
  Set-Content -Path "${env:SM_CLIENT_CERT_FILE}.b64" -Value $env:SM_CLIENT_CERT_FILE_B64

  Write-Host "[$whoami] Decoding certificate file content..."
  certutil -decode "${env:SM_CLIENT_CERT_FILE}.b64" $env:SM_CLIENT_CERT_FILE

  Write-Host "[$whoami] Verifying SM Tools install..."
  & $smctlExe healthcheck --all
  if ($LASTEXITCODE -ne 0) {
    throw "SM Tools healthcheck failed with exit code $LASTEXITCODE"
  }

  # Sync certificate
  Write-Host "[$whoami] Synchronizing certificate..."
  & $smctlExe windows certsync --keypair-alias="${env:SM_KEYPAIR_ALIAS}"
  if ($LASTEXITCODE -ne 0) {
    throw "SM Tools certsync failed with exit code $LASTEXITCODE"
  }
} catch {
  throw $PSItem
}
