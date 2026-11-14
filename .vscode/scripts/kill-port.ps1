param(
  [Parameter(Mandatory = $true)]
  [ValidateRange(1, 65535)]
  [int]$Port
)

. "$PSScriptRoot\port-process-tools.ps1"

$portEntries = @(
  Get-ListeningPortEntries -FilterPorts @($Port)
)

if ($portEntries.Count -eq 0) {
  Write-Host "No process is using port $Port."
  exit 0
}

$processEntries = @(
  $portEntries |
    Group-Object ProcessId |
    ForEach-Object {
      $processSnapshot = Get-ProcessSnapshot -ProcessId ([int]$_.Name)

      [PSCustomObject]@{
        Id = $processSnapshot.Id
        ProcessName = $processSnapshot.ProcessName
        SessionId = $processSnapshot.SessionId
        MatchSource = $processSnapshot.MatchSource
        SkipReason = $processSnapshot.SkipReason
        IsTargetDevProcess = $processSnapshot.IsTargetDevProcess
      }
    } |
    Sort-Object Id
)

$targetProcessIds = @(
  $processEntries |
    Where-Object { $_.IsTargetDevProcess } |
    Select-Object -ExpandProperty Id
)

$skippedProcessEntries = @(
  $processEntries |
    Where-Object { -not $_.IsTargetDevProcess }
)

if ($targetProcessIds.Count -eq 0) {
  Write-Warning "Port $Port is in use, but not by a bun/node/vite-style dev process in this VS Code session."

  if ($skippedProcessEntries.Count -gt 0) {
    ($skippedProcessEntries | Format-Table -Property Id, ProcessName, SessionId, SkipReason -AutoSize | Out-String).TrimEnd() | Write-Host
  }

  exit 0
}

Write-Host "Stopping dev process(es) using port $Port..."
($processEntries | Format-Table -Property Id, ProcessName, SessionId, MatchSource -AutoSize | Out-String).TrimEnd() | Write-Host

if ($skippedProcessEntries.Count -gt 0) {
  Write-Host ""
  Write-Host "Skipped non-dev or out-of-session processes:"
  ($skippedProcessEntries | Format-Table -Property Id, ProcessName, SessionId, SkipReason -AutoSize | Out-String).TrimEnd() | Write-Host
}

$failedProcessIds = @()

# Each port owner is stopped with its whole dev tree (see Get-DevTreeRoot).
$treeRoots = @(
  $targetProcessIds |
    ForEach-Object { Get-DevTreeRoot -ProcessId $_ } |
    Sort-Object -Unique
)

foreach ($rootId in $treeRoots) {
  $result = Stop-DevProcessTree -ProcessId $rootId
  if ($result.Succeeded) {
    Write-Host "Stopped the dev tree of PID $rootId." -ForegroundColor Green
  } else {
    Write-Warning "Could not stop the dev tree of PID ${rootId}: $($result.Output)"
    $failedProcessIds += $rootId
  }
}

# taskkill returns before Windows has released every socket.
Start-Sleep -Milliseconds 500

$remainingProcessIds = @(
  Get-ListeningPortEntries -FilterPorts @($Port) |
    Where-Object { $targetProcessIds -contains $_.ProcessId } |
    Select-Object -ExpandProperty ProcessId -Unique
)

if ($remainingProcessIds.Count -gt 0) {
  Write-Warning "Port $Port is still in use by PID(s): $($remainingProcessIds -join ', ')"
  exit 1
}

if ($failedProcessIds.Count -gt 0) {
  exit 1
}

Write-Host "Port $Port is now free." -ForegroundColor Green
