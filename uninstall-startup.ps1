$ErrorActionPreference = "SilentlyContinue"

$Startup = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $Startup "PromptWeaver Server.lnk"

Remove-Item -LiteralPath $ShortcutPath -Force
