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
    # Download SM Tools with retries. History: the ~118 MB download takes
    # minutes on hosted runners and used to be silently truncated, which
    # msiexec rejects with the cryptic exit 1620 ("not a valid Windows
    # Installer package"). A truncated file keeps the valid OLE header, so
    # checking the magic bytes alone is NOT enough. Two defenses before
    # installing:
    #  1. the downloaded size must match the Content-Length announced by
    #     the server (catches truncation);
    #  2. the file must start with the OLE compound magic d0cf11e0a1b11ae1
    #     (catches HTML/error pages).
    # curl.exe ships with Windows Server 2022 and is far faster and more
    # reliable than Invoke-WebRequest, whose progress rendering alone can
    # slow large downloads several-fold. NB: use curl.exe explicitly -
    # plain "curl" is an alias for Invoke-WebRequest in PowerShell 5.1.
    $downloaded = $false
    $actual = 0
    $magic = ''
    foreach ($attempt in 1..3) {
      Write-Host "[$whoami] Downloading SM Tools (attempt $attempt/3)..."
      $headers = & curl.exe -sI --connect-timeout 30 -H "x-api-key: $env:SM_API_KEY" $env:SM_TOOLS_URI
      $expected = $null
      foreach ($line in $headers) {
        if ($line -match '(?i)^content-length:\s*(\d+)') {
          $expected = [long]$Matches[1]
          break
        }
      }
      & curl.exe -sS --connect-timeout 30 -H "x-api-key: $env:SM_API_KEY" -H "Accept: application/octet-stream" -o smtools.msi $env:SM_TOOLS_URI
      if ($LASTEXITCODE -ne 0) {
        Write-Warning "[$whoami] curl exited with code $LASTEXITCODE, retrying..."
        if ($attempt -lt 3) { Start-Sleep -Seconds (5 * $attempt) }
        continue
      }
      $actual = (Get-Item 'smtools.msi').Length
      if ($expected -ne $null -and $actual -ne $expected) {
        Write-Warning "[$whoami] smtools.msi truncated: $actual bytes instead of $expected, retrying..."
        if ($attempt -lt 3) { Start-Sleep -Seconds (5 * $attempt) }
        continue
      }
      $fs = [System.IO.File]::OpenRead('smtools.msi')
      $headerBytes = New-Object byte[] 8
      $null = $fs.Read($headerBytes, 0, 8)
      $fs.Close()
      $magic = ($headerBytes | ForEach-Object { $_.ToString('x2') }) -join ''
      if ($magic -ne 'd0cf11e0a1b11ae1') {
        Write-Warning "[$whoami] smtools.msi is not a valid MSI (magic=$magic), retrying..."
        if ($attempt -lt 3) { Start-Sleep -Seconds (5 * $attempt) }
        continue
      }
      if ($expected -eq $null -and $actual -lt 100000000) {
        Write-Warning "[$whoami] smtools.msi looks too small ($actual bytes) and no Content-Length was announced, retrying..."
        if ($attempt -lt 3) { Start-Sleep -Seconds (5 * $attempt) }
        continue
      }
      $downloaded = $true
      break
    }
    if (-not $downloaded) {
      throw "SM Tools download failed after 3 attempts (last: $actual bytes, magic=$magic)"
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
