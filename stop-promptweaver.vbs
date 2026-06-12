Option Explicit

Dim shell, fso, appDir, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = appDir

command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & appDir & "\stop-server.ps1"""
shell.Run command, 0, True
MsgBox "PromptWeaver server stopped.", 64, "PromptWeaver"
