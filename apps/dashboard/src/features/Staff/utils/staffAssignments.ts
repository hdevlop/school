export const formatAssignment = (assignment: any, language = 'en') => {
  if (!assignment) return '-';

  if (assignment.type === 'cleaner') {
    return [assignment.zoneName, assignment.zoneBuilding, assignment.zoneFloor].filter(Boolean).join(' · ') || assignment.zoneId || '-';
  }

  if (assignment.type === 'assistant') {
    return [assignment.className, assignment.sectionName].filter(Boolean).join(' / ') || assignment.classId || '-';
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

export const formatAssignments = (staff: any, language = 'en') => {
  const assignments = Array.isArray(staff?.assignments) ? staff.assignments : [];
  if (!assignments.length) return '-';
  return assignments.map((assignment) => formatAssignment(assignment, language)).filter(Boolean).join(', ') || '-';
};
