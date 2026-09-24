/** Teaching content within one already-booked routine period. */
export const MAX_ROUTINE_CONTENT_GROUPS = 6;
export const MAX_ROUTINE_CONTENT_LABEL_LENGTH = 100;

export type RoutineContentGroup =
  | { kind: 'fixed'; label: string }
  | { kind: 'alternative'; options: [string, string] };

export interface RoutineContent {
  contentGroups: RoutineContentGroup[];
}

export function describeRoutineContent(groups: RoutineContentGroup[], subjectName: string, orLabel: string): string {
  if (!groups.length) return subjectName;
  return groups.map((group) => group.kind === 'fixed'
    ? group.label
    : group.options.join(` ${orLabel} `)).join(' · ');
}
