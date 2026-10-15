' Kultur Tekno baslatici - PowerShell WinForms arayuzunu gizli (konsolsuz) acar.
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & dir & "\launcher.ps1"""
' 0 = pencere gizli, False = beklemeden don
sh.Run cmd, 0, False
