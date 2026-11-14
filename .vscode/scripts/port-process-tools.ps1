$script:CurrentSessionId = (Get-Process -Id $PID).SessionId
$script:DevProcessNames = @(
  "bun",
  "bunx",
  "node",
  "npm",
  "pnpm",
  "yarn",
  "vite",
  "next",
  "turbo",
  "tsx"
)
$script:DevToolPattern = '(?i)\b(bun|bunx|node|npm|pnpm|yarn|vite|next|turbo|tsx)\b'
$script:ExcludeCommandLinePatterns = @(
  '(?i)opencode',
  '(?i)\\.agents',
  '(?i)mcp-server',
  '(?i)copilot',
  '(?i)cursor',
  '(?i)code-helper',
  '(?i)extensionHost',
  '(?i)vscode'
)

function Get-ListeningPortEntries {
  param(
    [int[]]$FilterPorts
  )

  # TCP comes from the API, not from netstat's text. Windows can report a dev
  # server's listening socket with a state it cannot name: netstat then prints
  # it as FIN_WAIT_1, or leaves it out, while the server still answers. So a
  # listener is a socket with no remote end, whatever its state, except:
  #  - Bound: a socket reserved for an outgoing connection;
  #  - an ephemeral port (49152 and up) the same process also connects from,
  #    which this machine reports the same way for outgoing connections.
  # A listener's accepted connections share its own, lower port, so they never
  # hide it.
  $tcp = @(Get-NetTCPConnection -ErrorAction SilentlyContinue)
  $connectsFrom = @{}
  foreach ($connection in $tcp) {
    if ($connection.RemotePort -ne 0) {
      $connectsFrom["$($connection.OwningProcess):$($connection.LocalPort)"] = $true
    }
  }

  $tcpEntries = foreach ($connection in $tcp) {
    $port = [int]$connection.LocalPort
    $owner = [int]$connection.OwningProcess

    if ($connection.RemotePort -ne 0 -or $connection.RemoteAddress -notin @('0.0.0.0', '::')) {
      continue
    }

    if ([string]$connection.State -eq 'Bound') {
      continue
    }

    if ($port -ge 49152 -and $connectsFrom.ContainsKey("${owner}:${port}")) {
      continue
    }

    if ($FilterPorts.Count -gt 0 -and $FilterPorts -notcontains $port) {
      continue
    }

    if ($owner -gt 0) {
      [PSCustomObject]@{
        Protocol = "TCP"
        Address = [string]$connection.LocalAddress
        Port = $port
        ProcessId = $owner
      }
    }
  }

  $udpEntries = foreach ($line in (netstat -ano)) {
    if ($line -match '^\s*UDP\s+(?<address>.+):(?<port>\d+)\s+\S+\s+(?<pid>\d+)\s*$') {
      $port = [int]$Matches.port

      if ($FilterPorts.Count -gt 0 -and $FilterPorts -notcontains $port) {
        continue
      }

      if ([int]$Matches.pid -gt 0) {
        [PSCustomObject]@{
          Protocol = "UDP"
          Address = $Matches.address.Trim()
          Port = $port
          ProcessId = [int]$Matches.pid
        }
      }
    }
  }

  # One row per protocol, port and process: IPv4 and IPv6 listeners are one port.
  return @(
    @($tcpEntries) + @($udpEntries) |
      Where-Object { $_ } |
      Sort-Object Protocol, Port, ProcessId -Unique
  )
}

function Get-ProcessSnapshot {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId
  )

  $processName = "<already exited>"
  $sessionId = $null
  $commandLine = ""

  try {
    $process = Get-Process -Id $ProcessId -ErrorAction Stop
    $processName = $process.ProcessName
    $sessionId = $process.SessionId
  } catch {
  }

  try {
    $cimProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop

    if (-not $commandLine) {
      $commandLine = [string]$cimProcess.CommandLine
    }

    if ($processName -eq "<already exited>" -and $cimProcess.Name) {
      $processName = [System.IO.Path]::GetFileNameWithoutExtension([string]$cimProcess.Name)
    }
  } catch {
  }

  $normalizedProcessName = $processName.ToLowerInvariant()
  $isKnownDevProcessName = $normalizedProcessName -in $script:DevProcessNames
  $hasDevCommandLine = $commandLine -match $script:DevToolPattern
  $isCurrentSession = $null -ne $sessionId -and $sessionId -eq $script:CurrentSessionId
  $isExcludedProcess = $false
  $excludedBy = ""

  foreach ($pattern in $script:ExcludeCommandLinePatterns) {
    if ($commandLine -match $pattern) {
      $isExcludedProcess = $true
      $excludedBy = $pattern
      break
    }
  }

  $isTargetDevProcess = (-not $isExcludedProcess) -and $isCurrentSession -and ($isKnownDevProcessName -or $hasDevCommandLine)

  $skipReason = ""

  if ($processName -eq "<already exited>") {
    $skipReason = "already exited"
  } elseif ($isExcludedProcess) {
    $skipReason = "excluded ($excludedBy)"
  } elseif (-not $isCurrentSession) {
    $skipReason = "different session"
  } elseif (-not ($isKnownDevProcessName -or $hasDevCommandLine)) {
    $skipReason = "not a bun/node/vite dev process"
  }

  $matchSource = ""

  if ($isTargetDevProcess) {
    if ($isKnownDevProcessName -and $hasDevCommandLine) {
      $matchSource = "name+cmd"
    } elseif ($isKnownDevProcessName) {
      $matchSource = "name"
    } else {
      $matchSource = "cmd"
    }
  }

  return [PSCustomObject]@{
    Id = $ProcessId
    ProcessName = $processName
    SessionId = $sessionId
    CommandLine = $commandLine
    IsTargetDevProcess = $isTargetDevProcess
    MatchSource = $matchSource
    SkipReason = $skipReason
  }
}

# The top of the dev tree a port owner belongs to: its parents while they are
# dev tools of this session too (bun run dev -> next.exe -> node next dev ->
# the server that holds the port). The first other parent, such as the
# terminal's shell, ends the climb and is never stopped.
function Get-DevTreeRoot {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId
  )

  $root = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
  if (-not $root) {
    return $ProcessId
  }

  $seen = @{ [int]$root.ProcessId = $true }
  while ($root.ParentProcessId -and -not $seen.ContainsKey([int]$root.ParentProcessId)) {
    $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($root.ParentProcessId)" -ErrorAction SilentlyContinue
    # A parent that started after its child is a new process reusing a dead parent's id.
    if (-not $parent -or $parent.CreationDate -gt $root.CreationDate) {
      break
    }

    if (-not (Get-ProcessSnapshot -ProcessId ([int]$parent.ProcessId)).IsTargetDevProcess) {
      break
    }

    $seen[[int]$parent.ProcessId] = $true
    $root = $parent
  }

  return [int]$root.ProcessId
}

# Stops a dev tree whole. Windows does not end a process's children with it, so
# stopping only the port's owner left `next dev`, the bun launchers and the
# Turbopack workers running.
function Stop-DevProcessTree {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId
  )

  $output = & taskkill.exe /PID $ProcessId /T /F 2>&1
  $succeeded = $LASTEXITCODE -eq 0 -or -not (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)

  return [PSCustomObject]@{
    Succeeded = $succeeded
    Output = ($output | Out-String).Trim()
  }
}
