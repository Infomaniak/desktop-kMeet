!macro customUnInstall
    SetRegView 64
     DeleteRegKey HKCR "kmeet"
    SetRegView 32
     DeleteRegKey HKCR "kmeet"
!macroend
