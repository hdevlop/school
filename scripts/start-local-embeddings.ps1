param(
  [string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA 'SchoolAI'),
  [ValidateRange(1, 16)][int]$Threads = 2,
  [ValidateSet('EmbeddingGemma', 'Qwen3')][string]$Model = 'EmbeddingGemma'
)

$ErrorActionPreference = 'Stop'
$serverPath = Join-Path $InstallDirectory 'llama-b11146\llama-server.exe'
if ($Model -eq 'Qwen3') {
  $modelPath = Join-Path $InstallDirectory 'Qwen3-Embedding-0.6B-Q8_0.gguf'
  $port = 18081
  $modelAlias = 'qwen3-embedding'
  $logName = 'qwen'
} else {
  $modelPath = Join-Path $InstallDirectory 'embeddinggemma-300M-Q8_0.gguf'
  $port = 18080
  $modelAlias = 'embeddinggemma'
  $logName = 'server'
}
$pidPath = Join-Path $InstallDirectory "$logName.pid"
$healthUrl = "http://127.0.0.1:$port/health"

foreach ($requiredPath in @($serverPath, $modelPath)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Missing $requiredPath. See docs/tests/local-embeddings.md for installation."
  }
}

if (Test-Path -LiteralPath $pidPath) {
  $serverId = 0
  if ([int]::TryParse((Get-Content -LiteralPath $pidPath -Raw).Trim(), [ref]$serverId)) {
    $existing = Get-Process -Id $serverId -ErrorAction SilentlyContinue
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
      Where-Object { $_.OwningProcess -eq $serverId } | Select-Object -First 1
    if ($existing -and $existing.Path -eq $serverPath -and $listener) {
      $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 5
      if ($health.status -ne 'ok') { throw 'Existing embedding server is not ready.' }
      Write-Output "$Model server already running (PID $serverId) at http://127.0.0.1:$port/v1"
      return
    }
  }
}

# Do not overwrite logs or start a duplicate when another process owns this port.
if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
  throw "Port $port is occupied by another process. Inspect it before starting embeddings."
}

$serverArguments = @(
  '-m', ('"' + $modelPath + '"'), '--embeddings',
  '--host', '127.0.0.1', '--port', $port,
  '--threads', $Threads, '--threads-batch', $Threads,
  '--parallel', '1', '--ctx-size', '2048',
  '--batch-size', '2048', '--ubatch-size', '2048',
  '--n-gpu-layers', '0', '--alias', $modelAlias
)
$serverProcess = Start-Process -FilePath $serverPath -ArgumentList $serverArguments `
  -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $InstallDirectory "$logName.stdout.log") `
  -RedirectStandardError (Join-Path $InstallDirectory "$logName.stderr.log")
Set-Content -LiteralPath $pidPath -Value $serverProcess.Id

for ($attempt = 0; $attempt -lt 30; $attempt++) {
  $serverProcess.Refresh()
  if ($serverProcess.HasExited) {
    throw "Embedding server exited. Read $InstallDirectory\$logName.stderr.log."
  }
  try {
    $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 1
    if ($health.status -eq 'ok') {
      Write-Output "$Model server ready (PID $($serverProcess.Id)) at http://127.0.0.1:$port/v1"
      return
    }
  } catch {
    # Model loading can briefly return an unavailable response.
  }
  Start-Sleep -Milliseconds 500
}
throw "Embedding server has not become ready; process $($serverProcess.Id) remains running. Read its logs."
