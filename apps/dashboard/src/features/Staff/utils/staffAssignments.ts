import { isSchoolWideRole } from '@/shared/pageAccess';

export const formatAssignment = (assignment: any, language = 'en') => {
  if (!assignment) return '-';

  if (assignment.type === 'cleaner') {
    return [assignment.zoneName, assignment.zoneBuilding, assignment.zoneFloor].filter(Boolean).join(' · ') || assignment.zoneId || '-';
  }

  if (assignment.type === 'assistant' || assignment.type === 'supervisor') {
    return [assignment.className, assignment.sectionName].filter(Boolean).join(' / ') || assignment.classId || '-';
  }

  if (assignment.type === 'monitor') {
    return assignment.className || '-';
  }

  if (assignment.type === 'accountant') {
    return assignment.cycleLabels?.[language] || assignment.cycleName || assignment.cycleId || '-';
  }

  if (assignment.type === 'security') {
    return [assignment.zoneName, assignment.zoneBuilding, assignment.zoneFloor].filter(Boolean).join(' · ') || assignment.zoneId || '-';
  }

  if (assignment.type === 'driver' || assignment.type === 'busAssistant') {
    return [assignment.vehicleName, assignment.vehiclePlate].filter(Boolean).join(' · ') || assignment.vehicleId || '-';
  }

  return '-';
};

// Current assignments only; the list carries every year's history too.
export const currentAssignmentLabels = (staff: any, language = 'en'): string[] =>
  (Array.isArray(staff?.assignments) ? staff.assignments : [])
    .filter((assignment) => assignment.current !== false)
    .map((assignment) => formatAssignment(assignment, language))
    .filter(Boolean);

export const formatAssignments = (staff: any, language = 'en') =>
  currentAssignmentLabels(staff, language).join(', ') || '-';

// A job title that signs in with a school-wide role (registrar, secretary, ...) reads every class, so
// having no assignment means the whole school, not nothing. One with an assignment (an accountant's
// cycle) keeps it. The access role decides, not the title's code: a custom title can use any role.
// An accountant following every active cycle also covers the whole school.
export const coversWholeSchool = (staff: any, activeCycleIds?: string[]) => {
  const current = (Array.isArray(staff?.assignments) ? staff.assignments : []).filter((assignment) => assignment.current !== false);
  if (!current.length) return isSchoolWideRole(staff?.accessRole);
  if (!activeCycleIds?.length || current.some((assignment) => assignment.type !== 'accountant')) return false;
  const followed = new Set(current.map((assignment) => assignment.cycleId));
  return activeCycleIds.every((id) => followed.has(id));
};
