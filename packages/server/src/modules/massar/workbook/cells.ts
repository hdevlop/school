export const MASSAR_CELLS = {
  schoolCode: 'C5', classGuid: 'E5', term: 'G5', exam: 'I5', subjectCode: 'K5', yearId: 'M5', levelCode: 'O5',
  academy: 'D7', direction: 'I7', schoolName: 'O7', levelLabel: 'D9', className: 'I9',
  termLabel: 'D11', examLabel: 'I11', subjectName: 'O11', yearLabel: 'D13',
} as const;
export const FIRST_STUDENT_ROW = 18;
export const FIRST_COMPONENT_COLUMN = 7;
export const MAX_COMPONENTS = 13;
export const MAX_STUDENTS = 187; // The official skeleton ends at row 204; never insert rows.
export const MASSAR_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export function columnName(index: number): string {
  let name = '';
  for (; index > 0; index = Math.floor((index - 1) / 26)) name = String.fromCharCode(65 + (index - 1) % 26) + name;
  return name;
}
