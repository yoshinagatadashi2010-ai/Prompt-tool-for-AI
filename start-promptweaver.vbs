Option Explicit

Dim shell, fso, appDir, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = appDir

command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & appDir & "\start-server.ps1"""
shell.Run command, 0, True
shell.Run "http://127.0.0.1:8765/index.html", 1, False
