import { examPlanningSemester } from './examPlanning';
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
/** A component of an owned, opened sheet that can be selected on Grades. */
export interface MassarGradeSource {
  id: string; sheetId: string; componentCode: string; title: string;
  classId: string; sectionId: string; subjectId: string; teacherId: string | null;
  totalMarks: number; term: number; exam: number; termLabel: string; examLabel: string;
  linkedExamId: string | null;
}
export interface MassarStudent { id: string; studentCode: string; name: string; dateOfBirth: string; massarStudentId: string | number | null; position: number }
export interface MassarSheetRow {
  id: string; roundId: string; className: string; subjectName: string; teacherName: string | null;
  /** False while the subject comes from last year's files (the default model): export waits for this year's file. */
  subjectConfirmed?: boolean;
  status: MassarSheetStatus; missing: number; total: number; revision: number;
  termLabel: string; examLabel: string; roundStatus: MassarRoundStatus;
  dueDate?: string | null; late?: boolean;
}
export interface MassarRound { id: string; term: number; exam: number; termLabel: string; examLabel: string; status: MassarRoundStatus; dueDate?: string | null }
export interface MassarBlockedClass { className: string; unmatchedCount: number }
export interface MassarSheetDetail {
  sheet: MassarSheetRow; round: MassarRound; components: MassarComponent[]; maxMark: number;
  students: MassarStudent[]; marks: MassarMark[]; canEdit: boolean; canReopen: boolean;
  schoolName: string; levelLabel: string; yearLabel: string;
}
export interface MassarMappings {
  classes: Array<{ name: string; classId: string | null; sectionId: string | null }>;
  subjects: Array<{ level: string; code: string; subjectId: string | null }>;
}
export interface MassarSetup {
  year: { templateReady: boolean } | null; yearLabel: string;
  levels: Array<{ id: string; code: string; kind?: MassarSheetKind }>;
  classes: Array<{ id: string; name: string; levelId: string; classId: string | null; sectionId: string | null; unmatchedCodes: string[]; pendingStudents?: MassarPendingStudent[] }>;
  subjects: Array<{ id: string; levelId: string; code: string; name: string; subjectId: string | null; components: MassarComponent[]; observedRounds?: Array<{ term: number; exam: number }>; confirmed?: boolean }>;
  appClasses: Array<{ id: string; name: string }>;
  appSections: Array<{ id: string; classId: string; name: string }>;
  appSubjects: Array<{ id: string; name: string }>;
  appStudents: Array<{ id: string; studentCode: string; name: string }>;
  enrollments: Array<{ enrollment: { id: string; studentId: string; massarClassId: string; name: string; leftOn: string | null }; studentCode: string }>;
}
/**
 * A Massar student in an import check. `suggestion` is the one School student
 * with the same birth date (and Arabic name or class) that no Massar code
 * reaches yet: probably the same child under School's own number.
 */
export type MassarMatchReason = 'birthDate' | 'name' | 'similarName' | 'class';
export interface MassarPreviewStudent {
  studentCode: string; name: string; dateOfBirth: string; studentId: string | null; warning: boolean;
  /** `strong`: the same birth date and the same Arabic name or class. */
  suggestion: { studentId: string; name: string; studentCode: string; reasons: MassarMatchReason[]; strong: boolean } | null;
  /** School's record of the linked (or suggested) student, only where its class or birth date differs from Massar. */
  school: { classId: string | null; sectionId: string | null; dateOfBirth: string | null; arabicName: string | null; placeDiffers: boolean; dateDiffers: boolean; nameDiffers: boolean } | null;
}
/** A Massar student an imported class still waits for, with its "same student?" guess. */
export type MassarPendingStudent = Pick<MassarPreviewStudent, 'studentCode' | 'name'> & Partial<Pick<MassarPreviewStudent, 'dateOfBirth' | 'suggestion'>>;
/** Decisions taken in the import check, applied with the import itself. */
export interface MassarStudentDecisions {
  matches: Array<{ studentCode: string; studentId: string }>;
  additions: Array<{ studentCode: string; gender: 'M' | 'F' }>;
  /** Massar is the reference: these students take their Massar class, birth date and Arabic name in School. */
  fixes: string[];
}
export interface MassarImportPreview extends MassarMappings {
  previewId: string; digest: string; hasCleanTemplate: boolean; acceptedCount: number; missingClasses: string[];
  refused: Array<{ name: string; key: string }>;
  classes: Array<MassarMappings['classes'][number] & { level: string; change: string; students: MassarPreviewStudent[]; missing: Array<{ studentCode: string; name: string }> }>;
  // `confirms`: the file confirms a subject from last year's files; `lostMarks`: marks on parts it does not have, removed with the import.
  subjects: Array<MassarMappings['subjects'][number] & { name: string; components: MassarComponent[]; change: string; confirms?: boolean; lostMarks?: number }>;
}
/**
 * The date marks are due for each Contrôle of the year. Which Contrôles exist
 * comes from Planning (`massarPlanningControls`); `primary` and `college` are
 * kept from an earlier plan and no longer decide it. Integrated activities
 * (Contrôle 4) are outside the plan.
 */
export interface MassarPlan { primary: number; college: number; dates: Array<{ term: number; exam: number; dueDate: string | null }> }
export const MASSAR_DEFAULT_PLAN: MassarPlan = { primary: 2, college: 3, dates: [] };
export const MASSAR_MAX_EXAMS_PER_TERM = 3;
/**
 * The year's Contrôles, read from Planning: in each semester, every month with
 * exams is one Contrôle, in order (the first is Contrôle 1). Planning a month
 * of exams adds a Contrôle; nothing else sets how many there are. Each carries
 * when its exams take place, across the school, and the classes that have them.
 */
export function massarPlanningControls(plans: Array<{ classId: string; months: Record<string, Array<{ date?: string }>> | null | undefined }>) {
  const byMonth = new Map<string, { dates: string[]; classIds: Set<string> }>();
  for (const plan of plans) for (const [month, entries] of Object.entries(plan.months ?? {})) {
    const dates = (entries ?? []).map(entry => entry?.date).filter((date): date is string => typeof date === 'string' && date.startsWith(month));
    if (!dates.length) continue;
    const found = byMonth.get(month) ?? { dates: [], classIds: new Set<string>() };
    found.dates.push(...dates); found.classIds.add(plan.classId); byMonth.set(month, found);
  }
  // Massar holds at most three Contrôles a semester; the fourth slot is the integrated activities.
  return ([1, 2] as const).flatMap(term => [...byMonth.keys()].filter(month => examPlanningSemester(month) === term).sort().slice(0, MASSAR_MAX_EXAMS_PER_TERM).map((month, index) => {
    const { dates, classIds } = byMonth.get(month)!, sorted = [...dates].sort();
    return { term, exam: index + 1, examFrom: sorted[0], examTo: sorted[sorted.length - 1], classIds: [...classIds].sort() };
  }));
}
/** Match Excel's decimal validation; there is no observed rounding/step rule. */
export function isValidMassarMark(mark: number | null, absence: MassarAbsence, maxMark: number) {
  return (mark === null || (Number.isFinite(mark) && mark >= 0 && mark <= maxMark)) && !(mark !== null && absence === 'justified');
}
