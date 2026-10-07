const normalize = text => String(text ?? '').normalize('NFKD').toLowerCase()
  .replace(/\p{M}|ـ/gu, '').replace(/[أإآ]/gu, 'ا').replace(/[’`]/g, "'");
const attendanceQuery = /attendance|absen[ct]|presen[ct]|asistencia|ausencia|حضور|غياب|غايب/u;
const emptyAttendanceClaim = /\b(?:no|zero)\s+(?:recorded\s+)?(?:attendance|absence|absences)\b|\bno\s+(?:records?\s+(?:of|for)\s+)?(?:attendance|absence)\b|\b(?:aucun\w*|pas\s+d['e])\s+(?:enregistrement\w*\s+(?:de\s+|d'))?(?:presence|absence)\b|\b(?:no\s+hay|ningun\w*)\s+(?:registros?\s+de\s+)?(?:asistencia|ausencia)\b|(?:لا\s+(?:توجد|يوجد)|ما\s*كاين(?:ين)?ش?)[^.؟!\n]{0,100}(?:غياب|حضور)/u;
const attendanceTools = new Set(['attendance_get_by_student', 'attendance_get_today_students',
  'attendance_get_today_teachers', 'student-profile_get_attendance_summary']);
const decode = output => {
  if (typeof output !== 'string') return output;
  try { return JSON.parse(output); } catch { return null; }
};
const terminalFor = (tool, server) => typeof tool.toolCallId === 'string'
  ? server?.tools?.find(span => span.toolCallId === tool.toolCallId && span.name === tool.name) : undefined;

/** Narrow role-fixture regression; codes only. Wording heuristics still need reply review. */
export function scoreRoleLookup(reply, query) {
  const failures = [];
  const warnings = (reply.sample?.server?.tools ?? []).filter(tool => tool.outcome !== 'executed')
    .map(tool => ({ code: 'terminal_tool_not_executed', name: tool.name, outcome: tool.outcome }));
  if (!attendanceQuery.test(normalize(query))) return { failures, warnings, reviewRequired: false };
  const emptySearchCandidates = reply.tools.filter(tool => tool.name === 'search_search_students' && tool.outcome === 'output'
    && Array.isArray(decode(tool.output)) && decode(tool.output).length === 0);
  if (!emptySearchCandidates.length) return { failures, warnings, reviewRequired: false };
  const claimsEmpty = emptyAttendanceClaim.test(normalize(reply.text));
  if (!claimsEmpty) return { failures, warnings, reviewRequired: false };
  if (!emptySearchCandidates.some(tool => terminalFor(tool, reply.sample?.server)?.outcome === 'executed')) {
    return { failures, warnings, reviewRequired: true };
  }
  const verifiedAttendanceRead = reply.tools.some(tool => attendanceTools.has(tool.name) && tool.outcome === 'output'
    && terminalFor(tool, reply.sample?.server)?.outcome === 'executed' && decode(tool.output) != null);
  if (!verifiedAttendanceRead) failures.push('empty_attendance_after_missing_student');
  // Another read could concern a different student/filter; human review must establish applicability.
  return { failures, warnings, reviewRequired: verifiedAttendanceRead };
}
