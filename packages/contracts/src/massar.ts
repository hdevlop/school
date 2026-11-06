/** Massar exchange values are independent of School's grades and report cards. */
export const MASSAR_ABSENCE_VALUES = ['none', 'justified'] as const;
export const MASSAR_SHEET_STATUS_VALUES = ['not_started', 'in_progress', 'submitted', 'exported', 'changed_after_export'] as const;
export const MASSAR_ROUND_STATUS_VALUES = ['open', 'exported', 'closed'] as const;
export const MASSAR_SHEET_KIND_VALUES = ['components', 'exam'] as const;
export type MassarAbsence = typeof MASSAR_ABSENCE_VALUES[number];
export type MassarSheetStatus = typeof MASSAR_SHEET_STATUS_VALUES[number];
export type MassarRoundStatus = typeof MASSAR_ROUND_STATUS_VALUES[number];
export type MassarSheetKind = typeof MASSAR_SHEET_KIND_VALUES[number];
export interface MassarComponent { code: string; name: string }
export interface MassarMark { studentId: string; componentCode: string; mark: number | null; absence: MassarAbsence }
export interface MassarStudent { id: string; studentCode: string; name: string; dateOfBirth: string; massarStudentId: string | number | null; position: number }
export interface MassarSheetRow {
  id: string; roundId: string; className: string; subjectName: string; teacherName: string | null;
  status: MassarSheetStatus; missing: number; total: number; revision: number;
  termLabel: string; examLabel: string; roundStatus: MassarRoundStatus;
}
export interface MassarRound { id: string; term: number; exam: number; termLabel: string; examLabel: string; status: MassarRoundStatus }
export interface MassarBlockedClass { className: string; unmatchedCount: number }
export interface MassarSheetDetail {
  sheet: MassarSheetRow; round: MassarRound; components: MassarComponent[]; maxMark: number;
  students: MassarStudent[]; marks: MassarMark[]; canEdit: boolean; canReopen: boolean;
}
export interface MassarMappings {
  classes: Array<{ name: string; classId: string | null; sectionId: string | null }>;
  subjects: Array<{ level: string; code: string; subjectId: string | null }>;
}
export interface MassarSetup {
  year: { templateReady: boolean } | null; yearLabel: string; filledExportVerified: boolean;
  levels: Array<{ id: string; code: string }>;
  classes: Array<{ id: string; name: string; levelId: string; classId: string | null; sectionId: string | null; unmatchedCodes: string[] }>;
  subjects: Array<{ id: string; levelId: string; code: string; name: string; subjectId: string | null; components: MassarComponent[] }>;
  appClasses: Array<{ id: string; name: string }>;
  appSections: Array<{ id: string; classId: string; name: string }>;
  appSubjects: Array<{ id: string; name: string }>;
  appStudents: Array<{ id: string; studentCode: string; name: string }>;
  enrollments: Array<{ enrollment: { id: string; studentId: string; massarClassId: string; name: string; leftOn: string | null }; studentCode: string }>;
}
export interface MassarImportPreview extends MassarMappings {
  previewId: string; digest: string; hasCleanTemplate: boolean; acceptedCount: number; missingClasses: string[];
  refused: Array<{ name: string; key: string }>;
  classes: Array<MassarMappings['classes'][number] & { level: string; change: string; students: Array<{ studentCode: string; name: string; studentId: string | null; warning: boolean }>; missing: Array<{ studentCode: string; name: string }> }>;
  subjects: Array<MassarMappings['subjects'][number] & { name: string; components: MassarComponent[]; change: string }>;
}
/** Match Excel's decimal validation; there is no observed rounding/step rule. */
export function isValidMassarMark(mark: number | null, absence: MassarAbsence, maxMark: number) {
  return (mark === null || (Number.isFinite(mark) && mark >= 0 && mark <= maxMark)) && !(mark !== null && absence === 'justified');
}
