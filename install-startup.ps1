$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Startup = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $Startup "PromptWeaver Server.lnk"
$Target = Join-Path $Root "start-promptweaver.vbs"

if (-not (Test-Path -LiteralPath $Target)) {
  throw "start-promptweaver.vbs was not found."
}

$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $Target
$Shortcut.WorkingDirectory = $Root
$Shortcut.WindowStyle = 7
$Shortcut.Description = "Start PromptWeaver local server"
$Shortcut.Save()

& (Join-Path $Root "start-server.ps1")
