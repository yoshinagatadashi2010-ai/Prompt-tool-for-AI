$ErrorActionPreference = "Stop"

$Port = 8765
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Runtime = Join-Path $Root ".runtime"
$ConfigPath = Join-Path $Root "server-config.js"

function Get-LanIp {
  $matches = ipconfig | Select-String -Pattern "IPv4"
  foreach ($match in $matches) {
    if ($match.Line -match "(\d{1,3}(?:\.\d{1,3}){3})") {
      $ip = $Matches[1]
      if ($ip -notlike "169.254.*" -and $ip -ne "127.0.0.1") {
        return $ip
      }
    }
  }
  return "192.168.11.4"
}

function Test-PortListening {
  $result = netstat -ano | Select-String -Pattern ":$Port\s+.*LISTENING"
  return $null -ne $result
}

function Resolve-Pythonw {
  $pythonw = Get-Command pythonw.exe -ErrorAction SilentlyContinue
  if ($pythonw) {
    return $pythonw.Source
  }

  $python = Get-Command python.exe -ErrorAction SilentlyContinue
  if ($python) {
    $candidate = Join-Path (Split-Path -Parent $python.Source) "pythonw.exe"
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
    return $python.Source
  }

  throw "Python was not found. Install Python or add it to PATH."
}

New-Item -ItemType Directory -Force -Path $Runtime | Out-Null

$LanIp = Get-LanIp
$LanUrl = "http://$LanIp`:$Port/index.html"
$Config = "window.PROMPTWEAVER_SERVER = { lanHost: `"$LanIp`", port: $Port, lanUrl: `"$LanUrl`" };"
Set-Content -LiteralPath $ConfigPath -Value $Config -Encoding UTF8

if (-not (Test-PortListening)) {
  $Pythonw = Resolve-Pythonw
  $env:PROMPTWEAVER_PORT = "$Port"
  $Process = Start-Process -FilePath $Pythonw -ArgumentList @("promptweaver_server.py") -WorkingDirectory $Root -WindowStyle Hidden -PassThru
  Set-Content -LiteralPath (Join-Path $Runtime "server.pid") -Value $Process.Id -Encoding ASCII
  Start-Sleep -Milliseconds 800
}
