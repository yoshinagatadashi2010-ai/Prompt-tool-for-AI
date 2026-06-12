$ErrorActionPreference = "SilentlyContinue"

$Port = 8765
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidPath = Join-Path $Root ".runtime\server.pid"

$ids = @()
if (Test-Path -LiteralPath $PidPath) {
  $ids += Get-Content -LiteralPath $PidPath
}

$ids += netstat -ano |
  Select-String -Pattern ":$Port\s+.*LISTENING" |
  ForEach-Object { ($_ -split "\s+")[-1] }

$ids |
  Where-Object { $_ -match "^\d+$" -and $_ -ne "0" } |
  Sort-Object -Unique |
  ForEach-Object { Stop-Process -Id ([int]$_) -Force }

Remove-Item -LiteralPath $PidPath -Force
