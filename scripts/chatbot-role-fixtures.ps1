param(
  [string]$BaseUrl = 'http://localhost:3102',
  [string]$AcademicYear = '2026-2027',
  [Parameter(Mandatory=$true)][string]$Output,
  [string]$EnvFile = 'apps/dashboard/.env.local'
)
$ErrorActionPreference = 'Stop'
$roleOutputPath = [IO.Path]::GetFullPath($Output)
$roleFactsFile = Join-Path ([IO.Path]::GetDirectoryName($roleOutputPath)) ('role-preparation-facts-' + [guid]::NewGuid().ToString('N') + '.json')
# Existing authenticated UTF-8/internal-MCP transport and live registry. The
# helper's parameter names are dot-sourced; keep our private target separately.
. (Join-Path $PSScriptRoot 'chatbot-school-facts.ps1') -BaseUrl $BaseUrl -AcademicYear $AcademicYear -Output $roleFactsFile -EnvFile $EnvFile
function Read-RoleTool($Name, $Arguments) {
  $tool = @($registry.tools | Where-Object { $_.name -eq $Name })[0]
  if (!$tool -or $tool.annotations.readOnlyHint -ne $true) { throw 'Required read-only role fixture tool is unavailable' }
  $result = Invoke-SchoolMcp 'tools/call' ([ordered]@{ name=$Name; arguments=$Arguments })
  $text = @($result.content | Where-Object { $_.type -eq 'text' })[0].text
  if (!$text) { throw 'Missing role fixture tool result' }
  return ($text | ConvertFrom-Json)
}
$students = @(Read-RoleTool 'students_get_students' ([ordered]@{academicYear=$AcademicYear}))
$parents = @(Read-RoleTool 'parents_get_parents' ([ordered]@{academicYear=$AcademicYear}))
$teachers = @(Read-RoleTool 'teachers_get_teachers' ([ordered]@{academicYear=$AcademicYear}))
if (!$students.Count -or !$students[0].id) { throw 'No scoped students available for role fixtures' }
$parent = $null
$children = @()
foreach ($candidate in ($parents | Where-Object {$_.email -and $_.totalChildren -ge 2} | Select-Object -First 15)) {
  $linked = @(Read-RoleTool 'parents_get_children' ([ordered]@{id=$candidate.id;academicYear=$AcademicYear}))
  if ($linked.Count -ge 2) { $parent=$candidate; $children=$linked; break }
}
if (!$parent) { throw 'No parent account with two scoped children; no records were created' }
$parentOther = @($students | Where-Object {$_.id -notin $children.id})[0]
$teacher = $null
$teacherStudents = @()
$teacherClasses = @()
foreach ($candidate in ($teachers | Where-Object {$_.email} | Select-Object -First 15)) {
  $scoped = Read-RoleTool 'teacher-profile_get_my_students' ([ordered]@{teacherId=$candidate.id;academicYear=$AcademicYear})
  $members = @($scoped.students)
  if ($members.Count -gt 0 -and $members.Count -lt $students.Count) {
    $classesReply = Read-RoleTool 'teacher-profile_get_my_classes' ([ordered]@{teacherId=$candidate.id;academicYear=$AcademicYear})
    if (@($classesReply.classes).Count -gt 0) { $teacher=$candidate; $teacherStudents=$members; $teacherClasses=@($classesReply.classes); break }
  }
}
if (!$teacher) { throw 'No teacher with scoped students and a provable outsider; no records were created' }
$teacherOther = @($students | Where-Object {$_.id -notin $teacherStudents.id})[0]
$student = @($students | Where-Object {$_.userId -and $_.email})[0]
if (!$student -or !$parentOther -or !$teacherOther) { throw 'Incomplete scoped role accounts or outsider fixtures' }
function Private-Student($Student) {
  $links = @(Read-RoleTool 'students_get_student_parents' ([ordered]@{id=$Student.id;academicYear=$AcademicYear}))
  return [ordered]@{id=$Student.id;name=$Student.name;parentPhones=@($links.phone | Where-Object {$_})}
}
$studentOther = $null
foreach ($candidate in ($students | Where-Object {$_.id -ne $student.id -and $_.sectionId -ne $student.sectionId} | Select-Object -First 15)) {
  $other = Private-Student $candidate
  if ($other.parentPhones.Count -gt 0) { $studentOther=$other; break }
}
if (!$studentOther) { throw 'No outsider with a parent phone; no records were created' }
$fixture = [ordered]@{version=1;source='internal-school-mcp-rest';capturedAt=[DateTime]::UtcNow.ToString('o');people=[ordered]@{
  year=$AcademicYear;
  parent=[ordered]@{email=$parent.email;children=@($children | Select-Object id,name);other=(Private-Student $parentOther)};
  teacher=[ordered]@{email=$teacher.email;assignments=$teacherClasses.Count;studentCount=@($teacherStudents.id | Sort-Object -Unique).Count;ownStudentIds=@($teacherStudents.id | Sort-Object -Unique);other=(Private-Student $teacherOther)};
  student=[ordered]@{email=$student.email;self=($student | Select-Object id,name);other=$studentOther};
  followUp=($students[-1] | Select-Object id,name)
}}
[IO.File]::WriteAllText($roleOutputPath,($fixture | ConvertTo-Json -Depth 14)+"`n",[Text.UTF8Encoding]::new($false))
Write-Output 'Captured private role fixtures through authorized internal MCP reads; no chats or school record changes. Keep this file outside tracked evidence.'
