param(
  [string]$BaseUrl = 'http://localhost:3102',
  [string]$AcademicYear = '2026-2027',
  [string]$Output = 'docs/evidence/chatbot-latency/morocco-school-facts.json',
  [string]$EnvFile = 'apps/dashboard/.env.local'
)
$ErrorActionPreference = 'Stop'
$target = [Uri]$BaseUrl
if ($target.Host -notin @('localhost', '127.0.0.1', '[::1]') -or $target.Scheme -notin @('http', 'https')) { throw 'Local app URLs only' }
if ($AcademicYear -notmatch '^\d{4}-\d{4}$') { throw 'Invalid academic year' }
$credentials = @{}
foreach ($line in Get-Content -LiteralPath $EnvFile) {
  if ($line -match '^\s*(ADMIN_EMAIL|ADMIN_PASSWORD)\s*=\s*(.*)$') { $credentials[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'") }
}
if (!$credentials.ADMIN_EMAIL -or !$credentials.ADMIN_PASSWORD) { throw 'Admin environment credentials required' }
$loginBody = [ordered]@{ email = $credentials.ADMIN_EMAIL; password = $credentials.ADMIN_PASSWORD } | ConvertTo-Json
function Invoke-Utf8School($Uri, $Method = 'Get', $Headers = @{}, $Body = $null) {
  $params = @{ Uri = $Uri; Method = $Method; Headers = $Headers; UseBasicParsing = $true }
  if ($null -ne $Body) { $params.ContentType = 'application/json; charset=utf-8'; $params.Body = [Text.Encoding]::UTF8.GetBytes($Body) }
  $reply = Invoke-WebRequest @params
  # Windows PowerShell 5.1 otherwise decodes a JSON response without an explicit
  # charset as Latin-1, corrupting French/Arabic names before they reach fixtures.
  $reply.RawContentStream.Position = 0
  $reader = [IO.StreamReader]::new($reply.RawContentStream, [Text.Encoding]::UTF8)
  try { return ($reader.ReadToEnd() | ConvertFrom-Json) } finally { $reader.Dispose() }
}
$login = Invoke-Utf8School "$BaseUrl/api/auth/login" 'Post' @{} $loginBody
$headers = @{ Authorization = "Bearer $($login.data.accessToken)"; Accept = 'application/json, text/event-stream' }
function Invoke-SchoolMcp($Method, $Params) {
  $body = [ordered]@{ jsonrpc = '2.0'; id = 1; method = $Method }
  if ($null -ne $Params) { $body.params = $Params }
  $reply = Invoke-Utf8School "$BaseUrl/api/mcp" 'Post' $headers ($body | ConvertTo-Json -Depth 20)
  if ($reply.error -or $reply.result.isError) { throw 'School MCP read failed' }
  return $reply.result
}
$registry = Invoke-SchoolMcp 'tools/list' $null
$required = @('exams_get_upcoming_exams', 'students_get_student_count', 'teachers_get_teacher_count')
foreach ($name in $required) { if ($name -notin $registry.tools.name) { throw "Read tool not available: $name" } }
function Read-SchoolTool($Name) {
  $result = Invoke-SchoolMcp 'tools/call' ([ordered]@{ name = $Name; arguments = [ordered]@{ academicYear = $AcademicYear } })
  $block = @($result.content | Where-Object { $_.type -eq 'text' })[0]
  if (!$block) { throw 'Missing MCP text result' }
  return ($block.text | ConvertFrom-Json)
}
$examRows = @(Read-SchoolTool 'exams_get_upcoming_exams')
$studentCount = Read-SchoolTool 'students_get_student_count'
$teacherCount = Read-SchoolTool 'teachers_get_teacher_count'
$classReply = Invoke-Utf8School "$BaseUrl/api/classes?academicYear=$AcademicYear" 'Get' $headers
$classes = @($classReply.data | ForEach-Object {
  [ordered]@{ name = $_.name; description = $_.description; level = $_.level; sections = @($_.sections.name | Sort-Object) }
})
$exams = @($examRows | Sort-Object date,startTime | ForEach-Object {
  [ordered]@{ title = $_.title; subject = $_.subject.name; class = $_.class.name; section = $_.section.name;
    date = $_.date; startTime = $_.startTime; endTime = $_.endTime }
})
$facts = [ordered]@{ capturedAt = [DateTime]::UtcNow.ToString('o'); academicYear = $AcademicYear;
  source = 'Internal Najm MCP read tools and GET /api/classes';
  studentCount = $studentCount.count; teacherCount = $teacherCount.count; classes = $classes; upcomingExams = $exams }
$json = $facts | ConvertTo-Json -Depth 20
[IO.File]::WriteAllText([IO.Path]::GetFullPath($Output), $json + "`n", [Text.UTF8Encoding]::new($false))
Write-Output "Captured school facts: $($classes.Count) classes, $($exams.Count) exams; no chat/provider requests."
