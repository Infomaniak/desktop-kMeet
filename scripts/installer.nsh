!macro customUnInstall
    SetRegView 64
     DeleteRegKey HKCR "kmeet"
     DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "kMeet"
    SetRegView 32
     DeleteRegKey HKCR "kmeet"
     DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "kMeet"
!macroend
