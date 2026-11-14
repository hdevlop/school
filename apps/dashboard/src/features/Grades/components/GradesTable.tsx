'use client';

import { FEATURE_ICONS } from '@/shared/featureIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { GradeDraft } from '../store/gradeDraftStore';
import { toast } from 'sonner';
import { useAuth } from 'najm-auth/client/react';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { NButton, NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState, useMediaQuery } from 'najm-kit';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import GradesHeader from './GradesHeader';
import GradeRosterCard from './GradeRosterCard';
import { useTeacherOverview } from '@/features/Dashboard/hooks/useTeacherDashboard';
import { Eye, LoaderCircle, Printer } from 'lucide-react';
import { useNThemeBrandingSlot } from 'najm-theme/react';
import { buildMassarDocument } from '@/features/Massar/config/massarDocument';
import { printPlanningDocument } from '@/features/Assessments/planning/planningDocument';
import { useGrades, useSourceGrades } from '../hooks/useGrades';
import { useMassarGrades } from '../hooks/useMassarGrades';
import { examSourcesWithMassar, massarMarkFromGrade, massarSourceLabels } from '../config/massarGradeSources';
import { compareMassarOrder } from '../config/massarRosterOrder';
import { studentListRead, useStudentsOnDate } from '@/features/Students/hooks/useStudents';
import { useYearScopedList } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { isStudentDisabled } from '@/features/Students/config/studentActivity';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useSections } from '@/features/Sections/hooks/useSections';
import { useSubjects } from '@/features/Subjects/hooks/useSubjects';
import { useTeachers } from '@/features/Teachers/hooks/useTeachers';
import { useAssessments } from '@/features/Assessments/hooks/useAssessments';
import { useExams } from '@/features/Exams/hooks/useExams';
import { useGradesTableColumns } from '../hooks/useGradesTableColumns';
import { useGradesTableFilters } from '../hooks/useGradesTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useTranslation } from 'najm-i18n/react';
import { EMPTY_GRADE_DRAFT, gradeDraftKey, useGradeDraftStore } from '../store/gradeDraftStore';
import { GradeRosterCardSkeleton } from '@/shared/PersonCardSkeleton';
import GradesSheet, { type GradeExamSheetProps } from './GradesSheet';
import GradeStudentMenu from './GradeStudentMenu';
import GradePaperPreview from './GradePaperPreview';
import { MobileFeatureActions } from '@/shared/FeatureActions';
import {
  completionListCss, completionText, cssString, isComplete, rosterCompletion, sheetComponentCompletion,
} from '../config/gradeCompletion';
import styles from './GradesTable.module.css';

const PASS_THRESHOLD = 50;
/** On a desktop the exam filter picks a Massar Contrôle, whose parts the sheet shows side by side. */
const MASSAR_SHEET_OPTION = 'massar-sheet:';
/** How long typing must pause before the roster saves: time to type "12.5" at an ordinary pace. */
const AUTOSAVE_DELAY_MS = 1500;
type GradeSourceType = 'assessment' | 'exam';

const computePercent = (obtained, total) => {
  if (obtained == null || total == null) return null;
  const o = Number(obtained);
  const t = Number(total);
  if (!t || isNaN(o) || isNaN(t)) return null;
  return Math.round((o / t) * 100);
};

const getSourceClassId = (source) => source?.classId || source?.class?.id || '';
const getSourceSectionId = (source) => source?.sectionId || source?.section?.id || '';
const getSourceSubjectId = (source) => source?.subjectId || source?.subject?.id || '';
const getSourceTeacherId = (source) => source?.teacherId || source?.teacher?.id || '';

const resolveGradeStatus = (marksObtained, fallback = 'pending') => {
  if (fallback === 'missed') return 'missed';
  return marksObtained == null || marksObtained === '' ? 'pending' : 'graded';
};

function GradesTableForYear() {
  const { t, language } = useTranslation();
  const { can } = useViewerRole();
  const { user } = useAuth();
  const role = (user as any)?.role;
  // Every exam belongs to one teacher assignment: a grade is given under the
  // exam's teacher, so class, section and subject are all there is to choose.
  const isTeacher = role === 'teacher';
  // A desktop grades on a Massar sheet, from the width Massar's own sheet starts at; a phone keeps the roster list.
  // Read as false before the screen is known, so a phone's first paint is already its list.
  const isSheet = useMediaQuery('(min-width: 768px)');
  // Massar's grid has marks typed and not yet saved: its filters wait.
  const [sheetBusy, setSheetBusy] = useState(false);

  // Saving goes through useGrades; its whole-year list is never read here.
  const { submitGrades, isSubmittingBatch } = useGrades({ enabled: false });
  const { classes, isClassesLoading } = useClasses();
  const { sections, isSectionsLoading } = useSections();
  const { subjects, isSubjectsLoading } = useSubjects();
  const { teachers } = useTeachers();
  const { assessments, isAssessmentsLoading } = useAssessments({ enabled: false });
  const { exams, isExamsLoading } = useExams();

  // A teacher has no "All classes": the page opens on one of their own (below).
  const [classId, setClassId] = useState(() => (isTeacher ? '' : 'all'));
  const isAllClasses = classId === 'all';
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  // Exams only for now; retain the source namespace used by existing drafts.
  const [sourceType] = useState<GradeSourceType>('exam');
  const [sourceId, setSourceId] = useState('');
  const massar = useMassarGrades(sourceId, sourceType === 'exam' && can('read:grades'));
  // A Massar source is read from its grid; only School's own exams have grades to read.
  const isSchoolSource = sourceType === 'assessment' || (exams || []).some((exam) => exam.id === sourceId);
  const { data: grades, error: gradesError, isLoading: isGradesLoading } = useSourceGrades(sourceType, sourceId, isSchoolSource && !massar.source);
  // Once the year has Massar parts, the exam list is Massar's only, on a phone as on a desktop: School's
  // own exams beside them only repeated them under near names (Orthographe beside Orthographe/Dictée).
  // A year without Massar keeps School's exams.
  const massarParts = massar.sources.data;
  const examSources = useMemo(() => examSourcesWithMassar(massarParts?.length ? [] : exams || [], massarParts || []), [exams, massarParts]);
  const massarLabels = useMemo(() => massarSourceLabels(massar.sources.data || []), [massar.sources.data]);
  const isSubmitting = isSubmittingBatch || massar.isSaving;

  const yearKey = useViewingYearKey();
  const draftKey = gradeDraftKey(user?.id ?? '', yearKey, sourceType, sourceId, sectionId);
  const draft = useGradeDraftStore((state) => state.drafts[draftKey] ?? EMPTY_GRADE_DRAFT);
  const patchDraft = useGradeDraftStore((state) => state.patch);
  const settleDraft = useGradeDraftStore((state) => state.settle);
  useEffect(() => { void useGradeDraftStore.persist?.rehydrate(); }, []);

  // A teacher grades only what they teach: their own assignments narrow the
  // class, section and subject choices. Other roles see every option.
  const { data: ownOverview } = useTeacherOverview(undefined, isTeacher);
  const ownAssignments = useMemo(() => {
    if (!isTeacher) return null;
    const self = (teachers || []).find((tc) => tc.id === ownOverview?.teacher.id);
    return Array.isArray(self?.assignments) ? self.assignments : [];
  }, [isTeacher, teachers, ownOverview]);

  const classOptions = useMemo(
    () => {
      const own = (classes || [])
        .filter((c) => !ownAssignments || ownAssignments.some((a) => a.classId === c.id))
        .map((c) => ({ value: c.id, label: c.name }));
      // A teacher grades one class at a time, among those they teach.
      return isTeacher ? own : [{ value: 'all', label: t('fees.filters.allClasses') }, ...own];
    },
    [classes, ownAssignments, isTeacher, t]
  );

  // A teacher opens straight on their first class; its first section and
  // subject follow (below), so there is nothing to pick before grading.
  useEffect(() => {
    if (!isTeacher) return;
    setClassId((current) => (classOptions.some((o) => o.value === current) ? current : (classOptions[0]?.value ?? '')));
  }, [isTeacher, classOptions]);
  const sectionOptions = useMemo(
    () => (sections || [])
      .filter((s) => !classId || isAllClasses || s.classId === classId)
      .filter((s) => !ownAssignments || ownAssignments.some((a) => a.classId === s.classId && a.sectionIds?.includes(s.id)))
      .map((s) => ({ value: s.id, label: s.name })),
    [sections, classId, isAllClasses, ownAssignments]
  );

  // Keep the selected section valid for the current class, falling back to the
  // first available section. The overview includes every section.
  useEffect(() => {
    setSectionId((current) => {
      if (isAllClasses) return '';
      return sectionOptions.some((o) => o.value === current) ? current : (sectionOptions[0]?.value ?? '');
    });
  }, [isAllClasses, sectionOptions]);

  // Changing what the roster is about invalidates whichever assessment or exam
  // was chosen for it.
  //
  // This lives in the filter handlers rather than in an effect on the filter
  // values, because choosing a source *also* fills in the subject and teacher
  // it belongs to (see the back-fill below). An effect cannot tell that
  // back-fill apart from a person changing a filter, so it used to clear the
  // very selection that triggered it — picking an assessment while subject and
  // teacher were still empty discarded it on the spot. Only a deliberate change
  // clears the source now; the internal corrections keep the plain setters.
  const clearSource = useCallback(() => setSourceId(''), []);
  const selectClass = useCallback((value: string) => { setClassId(value); setSectionId(''); clearSource(); }, [clearSource]);
  const selectSection = useCallback((value: string) => { setSectionId(value); clearSource(); }, [clearSource]);
  const selectSubject = useCallback((value: string) => { setSubjectId(value); clearSource(); }, [clearSource]);

  // Drafts stay attached to their source and section when filters change.
  const subjectOptions = useMemo(
    () => (subjects || [])
      .filter((s) => !ownAssignments || ownAssignments.some((a) =>
        (!classId || isAllClasses || a.classId === classId)
        && (!sectionId || a.sectionIds?.includes(sectionId))
        && a.subjectIds?.includes(s.id)))
      .map((s) => ({
        value: s.id,
        label: s.code || s.name,
      })),
    [subjects, ownAssignments, classId, isAllClasses, sectionId]
  );

  // A teacher opens on a subject they teach in the chosen section.
  useEffect(() => {
    if (!ownAssignments) return;
    setSubjectId((current) =>
      subjectOptions.some((option) => option.value === current) ? current : (subjectOptions[0]?.value ?? '')
    );
  }, [ownAssignments, subjectOptions]);
  const filteredSources = useMemo(
    () => (sourceType === 'assessment' ? (assessments || []) : examSources)
      .filter((item) => !classId || getSourceClassId(item) === classId)
      .filter((item) => !sectionId || getSourceSectionId(item) === sectionId)
      .filter((item) => !subjectId || getSourceSubjectId(item) === subjectId),
    [assessments, examSources, sourceType, classId, sectionId, subjectId]
  );
  // With no subject chosen, every subject's Contrôle had the same name ("الدورة
  // الأولى · الفرض الأول" once per subject), so each option leads with its
  // subject, as the subject filter names it.
  const subjectLabels = useMemo(() => new Map((subjects || []).map((s) => [s.id, s.code || s.name])), [subjects]);
  const withSubject = useCallback((item, label: string) => (subjectId
    ? label
    : [subjectLabels.get(getSourceSubjectId(item)), label].filter(Boolean).join(' · ')), [subjectId, subjectLabels]);
  const sourceOptions = useMemo(
    () => filteredSources.map((item) => ({
      value: item.id,
      label: withSubject(item, massarLabels.get(item.id) ?? item.title),
    })),
    [filteredSources, massarLabels, withSubject]
  );
  // A desktop grades a Massar Contrôle on its full grid, every part side by
  // side, so its list offers each Contrôle once; a phone lists the parts one by
  // one. School's exams stay one by one on both.
  const sheetOptions = useMemo(() => {
    const seen = new Set<string>();
    return filteredSources.flatMap((item) => {
      if (!('sheetId' in item)) return [{ value: item.id, label: withSubject(item, item.title) }];
      if (seen.has(item.sheetId)) return [];
      seen.add(item.sheetId);
      return [{ value: `${MASSAR_SHEET_OPTION}${item.sheetId}`, label: withSubject(item, `${item.termLabel} · ${item.examLabel}`) }];
    });
  }, [filteredSources, withSubject]);
  // A Contrôle stands for its first part: a phone's roster list opens on that part.
  const sourceOfOption = useCallback((value: string) => value.startsWith(MASSAR_SHEET_OPTION)
    ? filteredSources.find((item) => 'sheetId' in item && item.sheetId === value.slice(MASSAR_SHEET_OPTION.length))?.id ?? ''
    : value, [filteredSources]);
  // A desktop that reads Massar shows Massar's grid and nothing else: its grid
  // already has every part, so there is no exam to pick, only a Contrôle when a
  // subject has several. Exam Planning's own exams are
  // not Massar parts; they stay on the phone's list. Without Massar, a desktop
  // keeps the exam list.
  const gridOnly = isSheet && !!massarParts?.length;
  const contrôleOptions = useMemo(
    () => sheetOptions.filter((option) => option.value.startsWith(MASSAR_SHEET_OPTION)),
    [sheetOptions]
  );
  const pickOptions = !isSheet ? sourceOptions : gridOnly ? contrôleOptions : sheetOptions;
  const selectSheetOption = useCallback((value: string) => setSourceId(sourceOfOption(value)), [sourceOfOption]);

  // Nothing to pick: with Massar, the subject's newest Contrôle (the list runs
  // oldest to newest, see examSourcesWithMassar), the one being filled in. A
  // desktop opens its grid straight away; a phone opens its first part, so the
  // list can count every part of it. Otherwise the only exam for this class,
  // section and subject.
  const opensNewestContrôle = !!massarParts?.length && !!subjectId;
  const defaultOption = !sectionId || isAllClasses ? ''
    : gridOnly ? (subjectId ? contrôleOptions.at(-1)?.value ?? '' : '')
      : opensNewestContrôle && contrôleOptions.length ? contrôleOptions.at(-1)!.value
        : pickOptions.length === 1 ? pickOptions[0].value : '';
  const defaultSourceId = defaultOption ? sourceOfOption(defaultOption) : '';
  useEffect(() => {
    if (!defaultSourceId) return;
    // A grid-only desktop keeps a chosen Contrôle, and replaces anything else
    // (a Planning exam picked on the phone before the screen widened).
    setSourceId((current) => (gridOnly
      ? (filteredSources.some((item) => item.id === current && 'sheetId' in item) ? current : defaultSourceId)
      : current || defaultSourceId));
  }, [defaultSourceId, gridOnly, filteredSources]);

  const selectedSource = useMemo(
    () => {
      const list = sourceType === 'assessment' ? (assessments || []) : examSources;
      return list.find((item) => item.id === sourceId) || null;
    },
    [assessments, examSources, sourceType, sourceId]
  );

  // School owns the displayed roster, names and codes for every subject; the
  // rows follow Massar's order. The source's dated roster and Massar membership
  // govern editing only.
  const { data: students, error: studentsError, isLoading: isStudentsLoading } = useYearScopedList(studentListRead);
  const { students: eligibleStudents, error: eligibilityError, isStudentsLoading: isEligibilityLoading } = useStudentsOnDate(selectedSource?.date);
  const isMassarSheetLoading = !!massar.source && massar.sheet.isLoading;
  const isRosterUpdating = !!selectedSource && (isEligibilityLoading || isMassarSheetLoading);
  const isTableLoading = (!massar.source && isGradesLoading) || isStudentsLoading;
  const massarSheet = massar.source && massar.sheet.data?.sheet.id === massar.source.sheetId ? massar.sheet.data : null;
  const rosterError = (sourceType === 'exam' ? massar.sources.error : null)
    ?? (massar.source ? massar.sheet.error : gradesError) ?? studentsError ?? eligibilityError;

  useEffect(() => {
    if (!selectedSource) return;
    const selectedClassId = getSourceClassId(selectedSource);
    const selectedSectionId = getSourceSectionId(selectedSource);
    const selectedSubjectId = getSourceSubjectId(selectedSource);

    if (selectedClassId && !classId) setClassId(selectedClassId);
    if (selectedSectionId && !sectionId) setSectionId(selectedSectionId);
    if (selectedSubjectId && !subjectId) setSubjectId(selectedSubjectId);
  }, [selectedSource]); // eslint-disable-line react-hooks/exhaustive-deps

  const baseRoster = useMemo(() => {
    if (!isAllClasses && !sectionId) return [];
    const list = (students || []).filter((s) => {
      if (isStudentDisabled(s)) return false;
      if (!isAllClasses) return s.sectionId === sectionId;
      return !ownAssignments || ownAssignments.some((a) =>
        a.classId === s.classId && a.sectionIds?.includes(s.sectionId));
    });

    const gradesByStudent = new Map<string, any>();
    if (sourceId && !massar.source) {
      for (const g of grades || []) {
        const matchesSource = sourceType === 'assessment'
          ? g.assessmentId === sourceId
          : g.examId === sourceId;
        if (matchesSource) gradesByStudent.set(g.studentId, g);
      }
    }
    const massarMarks = new Map((massarSheet?.marks ?? [])
      .filter(mark => mark.componentCode === massar.source?.componentCode)
      .map(mark => [mark.studentId, mark]));
    // One remark per student for the grid's subject and Contrôle, whichever part is open.
    const massarRemarks = new Map((massarSheet?.remarks ?? []).map(item => [item.studentId, item.remark]));

    const ctxTeacherId = getSourceTeacherId(selectedSource);

    return list.sort(compareMassarOrder).map((s) => {
      const g = gradesByStudent.get(s.id);
      const mark = massarMarks.get(s.id);
      const hasMassarMark = !!mark && (mark.mark !== null || mark.absence === 'justified');
      const massarRowId = `${sourceId}:${s.id}`;
      return {
        rowId: s.id,
        gradeId: massar.source ? (hasMassarMark ? massarRowId : null) : g?.id || null,
        studentId: s.id,
        studentName: s.name,
        studentArabicName: s.arabicName || s.massarName || '',
        studentCode: s.studentCode,
        studentImage: s.image,
        studentUpdatedAt: s.updatedAt,
        gender: s.gender,
        phone: s.phone,
        className: s.class?.name,
        sectionName: s.section?.name,
        marksObtained: massar.source ? mark?.mark ?? null : g?.marksObtained ?? null,
        status: massar.source ? (mark?.absence === 'justified' ? 'missed' : mark?.mark != null ? 'graded' : 'pending') : g?.status ?? 'pending',
        feedback: g?.feedback ?? '',
        remark: massar.source ? massarRemarks.get(s.id) ?? '' : '',
        assessmentId: sourceType === 'assessment' ? (sourceId || null) : null,
        examId: sourceType === 'exam' && !massar.source ? (sourceId || null) : null,
        classId: getSourceClassId(selectedSource) || s.classId || (isAllClasses ? null : classId) || null,
        sectionId: s.sectionId || sectionId || null,
        subjectId: getSourceSubjectId(selectedSource) || subjectId || null,
        teacherId: ctxTeacherId || null,
        totalMarks: selectedSource?.totalMarks ?? null,
      };
    });
  }, [students, classId, isAllClasses, sectionId, ownAssignments, grades, sourceId, sourceType, selectedSource, subjectId, massar.source, massarSheet]);

  const stats = useMemo(() => {
    const withGrade = baseRoster.filter((r) => r.gradeId);
    const total = baseRoster.length;
    let passing = 0;
    let scored = 0;
    let highest: number | null = null;
    let lowest: number | null = null;
    for (const r of withGrade) {
      // An absent student has no mark to pass or fail with (School stores their grade as 0):
      // they count as done, never in the pass rate, the highest or the lowest.
      if (r.status === 'missed') continue;
      const pct = computePercent(r.marksObtained, r.totalMarks);
      if (pct == null) continue;
      scored++;
      if (pct >= PASS_THRESHOLD) passing++;
      if (highest == null || pct > highest) highest = pct;
      if (lowest == null || pct < lowest) lowest = pct;
    }
    const passRate = scored > 0 ? Math.round((passing / scored) * 100) : 0;
    return { total, graded: scored, passing, highest, lowest, passRate };
  }, [baseRoster]);

  const isMassarSource = !!massar.source;
  const editableRow = useCallback((row) => {
    // Saving does not lock the fields: what is typed meanwhile waits in the draft for the next save.
    if (isStudentsLoading || isEligibilityLoading || isMassarSheetLoading || rosterError || !selectedSource) return false;
    if (isMassarSource) return can('update:grades') && !!massarSheet?.canEdit
      && massarSheet.students.some(student => student.id === row.studentId);
    return can(row.gradeId ? 'update:grades' : 'create:grades') && !isGradesLoading
      && (!!row.assessmentId || !!row.examId) && !!row.classId && !!row.sectionId && !!row.subjectId && !!row.teacherId
      && (eligibleStudents || []).some(student => student.id === row.studentId && student.sectionId === row.sectionId);
  }, [isStudentsLoading, isEligibilityLoading, isMassarSheetLoading, rosterError, selectedSource, isMassarSource, can, massarSheet, isGradesLoading, eligibleStudents]);
  // The columns must not change while marks are typed or saved: a new cell
  // function is a new component to the table, which would remount the field
  // and drop the focus after each keystroke. So every callback they take is
  // stable, and each row carries whether it may be edited.
  const canEdit = useCallback((row) => !!row?.editable, []);

  // Overlay any pending draft edits on top of the saved roster so the table
  // reflects unsaved changes immediately.
  const roster = useMemo(
    () => baseRoster.map((r) => {
      const d = draft[r.studentId];
      const editable = editableRow(r);
      return d ? { ...r, ...d, isUnsaved: true, editable } : { ...r, isUnsaved: false, editable };
    }),
    [baseRoster, draft, editableRow]
  );

  // Progress counts only who can take a mark here: the Massar sheet's own
  // students, or the exam's dated roster. Unknown until that list has loaded.
  const canTakeMark = useMemo(() => {
    if (!selectedSource) return null;
    if (massar.source) {
      if (!massarSheet) return null;
      const ids = new Set(massarSheet.students.map((student) => student.id));
      return (row) => ids.has(row.studentId);
    }
    if (isEligibilityLoading || !eligibleStudents) return null;
    const sectionOf = new Map(eligibleStudents.map((student) => [student.id, student.sectionId]));
    return (row) => sectionOf.get(row.studentId) === row.sectionId;
  }, [selectedSource, massar.source, massarSheet, isEligibilityLoading, eligibleStudents]);
  // Typed marks count at once, before they are saved.
  const progress = useMemo(() => (canTakeMark ? rosterCompletion(roster, canTakeMark) : null), [roster, canTakeMark]);
  // Every component of the open Massar sheet; the one on screen counts what is typed too.
  const componentCompletion = useMemo(() => {
    if (!massar.source || !massarSheet) return null;
    const byComponent = sheetComponentCompletion(massarSheet);
    if (progress && byComponent.has(massar.source.componentCode)) byComponent.set(massar.source.componentCode, progress);
    return byComponent;
  }, [massar.source, massarSheet, progress]);

  // A Massar part's whole Contrôle as the admin's Massar page prints it, every
  // part side by side, with this part's typed marks as well: printed, or
  // looked at on the phone's read-only paper.
  const logo = useNThemeBrandingSlot('authLogo');
  const paperDocument = () => {
    if (!massar.source || !massarSheet) return '';
    const code = massar.source.componentCode;
    const typed = baseRoster.filter((row) => draft[row.studentId] && editableRow(row))
      .map((row) => massarMarkFromGrade(row.studentId, code, { ...row, ...draft[row.studentId] }));
    const typedIds = new Set(typed.map((mark) => mark.studentId));
    const sheet = {
      ...massarSheet,
      marks: [...massarSheet.marks.filter((mark) => mark.componentCode !== code || !typedIds.has(mark.studentId)), ...typed],
    };
    return buildMassarDocument([sheet], {
      language, logo, title: t('massar.flow.paperTitle'), student: t('massar.student'),
      teacher: t('massar.teacher'), term: t('massar.term'), exam: t('massar.exam'),
    });
  };
  const [isPrinting, setIsPrinting] = useState(false);
  const printSheet = async () => {
    const html = paperDocument();
    if (!html) return;
    // The window opens within the click, before anything is awaited, so no popup blocker stops it.
    setIsPrinting(true);
    try {
      if (!await printPlanningDocument(html)) toast.error(t('insurance.popupBlocked'));
    } finally {
      setIsPrinting(false);
    }
  };
  // The paper is drawn when it opens, from the marks as they are then.
  const [paperHtml, setPaperHtml] = useState<string | null>(null);

  const applyDraft = useCallback((studentId: string, patch: Record<string, any>) => {
    patchDraft(draftKey, studentId, patch);
  }, [patchDraft, draftKey]);

  const handleCellEdit = useCallback(async (row, columnId, value) => {
    if (!canEdit(row)) return;
    if (columnId === 'marksObtained') {
      applyDraft(row.studentId, { marksObtained: value, status: resolveGradeStatus(value) });
    } else if (columnId === 'feedback' && !isMassarSource) {
      applyDraft(row.studentId, { feedback: value });
    }
  }, [canEdit, applyDraft, isMassarSource]);

  const handleStatusToggle = useCallback((row) => {
    if (!canEdit(row)) return;
    const currentStatus = row.status || 'pending';
    if (currentStatus !== 'pending' && currentStatus !== 'missed') return;
    const nextStatus = currentStatus === 'pending' ? 'missed' : 'pending';
    applyDraft(row.studentId, { status: nextStatus });
  }, [canEdit, applyDraft]);

  // The sheet's "A" key, as on Massar's: the student was absent, whatever mark the cell held.
  const handleMarkAbsent = useCallback((row) => {
    if (!canEdit(row)) return;
    applyDraft(row.studentId, { marksObtained: null, status: 'missed' });
  }, [canEdit, applyDraft]);

  // A long press or a double tap on a student opens their menu: absent, clear the mark, remark.
  const [menuStudentId, setMenuStudentId] = useState<string | null>(null);
  const openStudentMenu = useCallback((row) => setMenuStudentId(row.studentId), []);
  const menuRow = menuStudentId ? roster.find((row) => row.studentId === menuStudentId) ?? null : null;
  // Absent replaces whatever mark was there, as the sheet's "A" key does; undone, the student waits for a mark.
  const toggleAbsent = useCallback((row) => (
    (row.status || 'pending') === 'missed' ? handleStatusToggle(row) : handleMarkAbsent(row)
  ), [handleStatusToggle, handleMarkAbsent]);
  const clearMark = useCallback((row) => {
    if (!canEdit(row)) return;
    applyDraft(row.studentId, { marksObtained: null, status: 'pending' });
  }, [canEdit, applyDraft]);
  // A Massar grid keeps one remark per student for its subject and Contrôle; one of School's exams keeps
  // it as the grade's feedback, saved with the marks.
  const saveRemark = async (row, remark: string) => {
    if (!massar.source) {
      handleCellEdit(row, 'feedback', remark);
      return;
    }
    try {
      await massar.saveRemark({ sheetId: massar.source.sheetId, studentId: row.studentId, remark });
      toast.success(t(remark ? 'grades.studentMenu.remarkSaved' : 'grades.studentMenu.remarkRemoved'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || t('grades.errors.saveFailed'));
      throw err;
    }
  };

  const hasChanges = Object.keys(draft).length > 0;
  const canSubmit = !!selectedSource && !isStudentsLoading && !isEligibilityLoading && !isMassarSheetLoading && !rosterError && !isSubmitting
    && (massar.source ? can('update:grades') && !!massarSheet?.canEdit
      : !isGradesLoading && (can('create:grades') || can('update:grades')));

  // The draft a save failed on: not retried until something changes, or Retry.
  const [failedDraft, setFailedDraft] = useState<GradeDraft | null>(null);
  const saveFailed = (err: any, snapshot: GradeDraft) => {
    setFailedDraft(snapshot);
    toast.error(err?.response?.data?.message || err?.message || t('grades.errors.saveFailed'));
  };

  /** Saves what the draft holds now; anything typed meanwhile is saved next. */
  const saveDraft = async (snapshot: GradeDraft) => {
    if (!canSubmit) return;

    if (massar.source && massarSheet) {
      const componentCode = massar.source.componentCode;
      const marks = baseRoster.filter(row => snapshot[row.studentId] && editableRow(row))
        .map(row => massarMarkFromGrade(row.studentId, componentCode, { ...row, ...snapshot[row.studentId] }));
      if (!marks.length) { settleDraft(draftKey, snapshot); return; }
      try {
        await massar.save({ sheetId: massar.source.sheetId, revision: massarSheet.sheet.revision, marks });
        settleDraft(draftKey, snapshot);
      } catch (err: any) {
        saveFailed(err, snapshot);
      }
      return;
    }

    const payloads = Object.keys(snapshot)
      .map((studentId) => baseRoster.find((r) => r.studentId === studentId))
      .filter((base): base is any => !!base && editableRow(base))
      .map((base) => {
        const merged = { ...base, ...snapshot[base.studentId] };
        const payload: any = {
          studentId: merged.studentId,
          assessmentId: merged.assessmentId,
          examId: merged.examId,
          classId: merged.classId,
          sectionId: merged.sectionId,
          subjectId: merged.subjectId,
          teacherId: merged.teacherId,
          marksObtained: merged.marksObtained ?? 0,
          status: merged.status ?? resolveGradeStatus(merged.marksObtained),
          feedback: merged.feedback ?? '',
        };
        if (merged.gradeId) payload.id = merged.gradeId;
        return payload;
      });

    if (payloads.length === 0) { settleDraft(draftKey, snapshot); return; }

    try {
      await submitGrades(payloads);
      settleDraft(draftKey, snapshot);
    } catch (err: any) {
      saveFailed(err, snapshot);
    }
  };

  // No Save button: a change is saved once typing pauses. Each save waits for the
  // previous one and its reload, so a new grade is never created twice and a
  // Massar grid always gets its latest revision.
  const waitingToSave = hasChanges && draft !== failedDraft;
  useEffect(() => {
    if (!waitingToSave || isSubmitting || !canSubmit) return;
    const timer = setTimeout(() => { void saveDraft(draft); }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  });

  const columns = useGradesTableColumns({ canEdit, onToggleStatus: handleStatusToggle, onEdit: handleCellEdit, allowFeedback: !isMassarSource });
  // Stable for the same reason as the columns: a new render function is a new
  // card component, which would remount the mark field after each keystroke.
  const renderRosterCard = useCallback((props: any) => (
    <GradeRosterCard {...props} canEdit={canEdit} onEdit={handleCellEdit} onToggleStatus={handleStatusToggle} allowFeedback={!isMassarSource} />
  ), [canEdit, handleCellEdit, handleStatusToggle, isMassarSource]);
  // On a phone every filter stays on screen, three to a row: class, section
  // and subject, then the exam on a row of its own, where its long Massar
  // name fits, then the student search.
  // The phone lists the open sheet's components one by one: each says how far
  // it got, at the right edge of the picker and of each option in its list.
  const completionCss = useMemo(() => (componentCompletion && !isSheet
    ? completionListCss(t('grades.toolbar.searchExam'), pickOptions.flatMap((option) => {
      const item = filteredSources.find((source) => source.id === option.value);
      return item && 'sheetId' in item && item.sheetId === massarSheet?.sheet.id
        ? [{ label: option.label, completion: componentCompletion.get(item.componentCode) }]
        : [];
    }))
    : ''), [componentCompletion, isSheet, pickOptions, filteredSources, massarSheet, t]);
  const completionStyle = !isSheet && progress && progress.total > 0 ? {
    '--grade-completion': cssString(completionText(progress)),
    ...(isComplete(progress) ? { '--grade-completion-color': 'var(--color-emerald-600, #059669)' } : {}),
  } as React.CSSProperties : undefined;
  const gradeFilters = useGradesTableFilters({
    classId, isAllClasses, sectionId, subjectId,
    // The filter row is the deliberate half: every change made here drops the
    // chosen assessment or exam with it.
    setClassId: selectClass,
    setSectionId: selectSection,
    setSubjectId: selectSubject,
    sourceType,
    sourceId: isSheet && selectedSource && 'sheetId' in selectedSource ? `${MASSAR_SHEET_OPTION}${selectedSource.sheetId}` : sourceId,
    setSourceId: isSheet ? selectSheetOption : setSourceId,
    sourceOptions: pickOptions,
    sourceClassName: styles.sourceFilter,
    classOptions, sectionOptions, subjectOptions,
    isClassesLoading, isSectionsLoading, isSubjectsLoading,
    isSourceLoading: sourceType === 'assessment' ? isAssessmentsLoading : isExamsLoading || (can('read:grades') && massar.sources.isLoading),
  });
  const noDataText = !classId
    ? t('grades.toolbar.selectClass')
    : !isAllClasses && !sectionId
      ? t('grades.toolbar.selectSection')
      : t('grades.toolbar.noStudents');
  const hasFailedSave = hasChanges && draft === failedDraft;
  const tableError = (sourceType === 'exam' ? massar.sources.error : null) || (massar.source ? massar.sheet.error : null)
    || (hasFailedToLoad(rosterError, roster) ? rosterError : null);
  const renderTableError = (currentError: unknown) => (
    isAuthorizationError(currentError)
      ? <NForbiddenState surface="panel" />
      : <NErrorState surface="panel" />
  );

  // The desktop sheet: Massar's own full grid for a Massar Contrôle (it reads,
  // checks and saves its marks itself), or the same grid with one column for
  // one of School's exams.
  const massarSheetId = isSheet && massar.source ? massar.source.sheetId : null;
  const sheetError = massarSheetId ? null : tableError;
  const examSheet: GradeExamSheetProps | null = isSheet && !gridOnly && !massarSheetId && selectedSource && !isAllClasses && sectionId && !sheetError
    && (isTableLoading || roster.length > 0) ? {
      title: selectedSource.title,
      total: selectedSource.totalMarks ?? null,
      meta: [classOptions.find((o) => o.value === classId)?.label, sectionOptions.find((o) => o.value === sectionId)?.label].filter(Boolean).join(' · '),
      passRate: stats.graded > 0 ? `${stats.passRate}%` : null,
      rows: roster,
      loading: isTableLoading,
      allowFeedback: !isMassarSource,
      onEdit: handleCellEdit,
      onAbsent: handleMarkAbsent,
      onToggleStatus: handleStatusToggle,
      failed: hasFailedSave,
      onRetry: () => { setFailedDraft(null); },
    } : null;
  const sheetPlaceholder = sheetError ? renderTableError(sheetError) : (
    <NEmptyState
      surface="panel"
      icon={FEATURE_ICONS.grades}
      title={isAllClasses || !classId
        ? t('grades.toolbar.selectClass')
        : !sectionId
          ? t('grades.toolbar.selectSection')
          : gridOnly && !subjectId
            ? t('grades.toolbar.selectSubject')
            : gridOnly && massar.sources.isLoading
              ? t('common.loading')
              : gridOnly && contrôleOptions.length === 0
                ? t('grades.toolbar.noMassarSheet')
                : !selectedSource ? t('grades.toolbar.selectSource') : t('grades.toolbar.noStudents')}
    />
  );
  // The grid-only desktop's list holds Contrôles only, and shows only when the
  // subject has several: by the end of the year that is one short list, where
  // a button per Contrôle would fill the row.
  const sheetFilters = gridOnly && !(subjectId && contrôleOptions.length > 1)
    ? gradeFilters.filter((filter) => filter.name !== 'source')
    : gradeFilters;
  // Massar's grid knows only its own Arabic names; the Latin one comes from School.
  const latinNames = useMemo(() => new Map<string, string>((students || []).map((s) => [s.id, s.name])), [students]);
  // The grid names the Contrôle, not the one part a phone's list would open on.
  const subtitleTitle = selectedSource && !massarSheetId ? ` · ${selectedSource.title}` : '';

  return (
    <div className='flex flex-col gap-2 w-full h-full min-h-0' style={completionStyle}>
      {completionCss ? <style>{completionCss}</style> : null}
      <NPageHeader
        icon={FEATURE_ICONS.grades}
        title={t('grades.messages.pageTitle')}
        subtitle={isCountUnknown(rosterError, roster, isTableLoading) ? undefined : `${t('grades.subtitle.count', { count: stats.total })}${subtitleTitle}${massar.source ? ` · ${massar.source.termLabel} · ${massar.source.examLabel}` : ''}`}
      >
        <NPageHeaderActions>
          {isRosterUpdating ? (
            <span role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
              <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
              <span className="sr-only">{t('common.loading')}</span>
            </span>
          ) : null}
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      {isSheet ? (
        <GradesSheet
          filters={sheetFilters}
          massarSheetId={massarSheetId}
          exam={examSheet}
          placeholder={sheetPlaceholder}
          busy={sheetBusy}
          onBusy={setSheetBusy}
          latinNames={latinNames}
        />
      ) : (
      <NTable
        exportTitle={t('grades.messages.pageTitle')}
        // NTable knows a phone only once it has measured the screen, so its first
        // frame is the table skeleton; a phone then shows cards. Hiding that table
        // skeleton below md leaves one skeleton, the cards'.
        className='min-h-0 flex-1 max-md:[&_[data-testid=ntable-loading-skeleton]:has(table)]:invisible'
        data={roster}
        columns={columns}
        filters={gradeFilters}
        // On a phone the save status and stats take their own full-width row
        // under the filters instead of hugging the right edge.
        classNames={{
          header: 'max-md:gap-y-2 max-md:[&>div:has(>.grades-stats)]:w-full',
          tableHeader: '[&_th:has(.grade-student-name-column)]:w-[28%]',
        }}
        // Highest, lowest and pass rate describe one assessment or exam; with
        // none chosen they would only read as dashes and 0%.
        headerSlot={sourceId ? (
          <div className="grades-stats flex w-full flex-col gap-2">
            {massar.source && massarSheet && !massarSheet.canEdit ? (
              <p role="status" className="text-xs text-muted-foreground">{t('massar.readOnly')}</p>
            ) : null}
            {/* The phone's ⋮ menu: the Massar paper, as the admin prints it, to
                print or to look at whole, every part side by side. */}
            {massarSheet ? (
              <MobileFeatureActions>
                <div className="md:hidden">
                  <NButton type="button" variant="ghost" disabled={isPrinting} onClick={() => { void printSheet(); }}>
                    <Printer aria-hidden="true" className="size-4" />
                    {t('insurance.print')}
                  </NButton>
                  <NButton type="button" variant="ghost" onClick={() => setPaperHtml(paperDocument())}>
                    <Eye aria-hidden="true" className="size-4" />
                    {t('grades.paperPreview')}
                  </NButton>
                </div>
              </MobileFeatureActions>
            ) : null}
            <GradesHeader
              stats={stats}
              failed={hasFailedSave}
              onRetry={() => { setFailedDraft(null); }}
            />
          </div>
        ) : undefined}
        onCellEdit={handleCellEdit}
        loading={isTableLoading}
        error={tableError}
        renderError={renderTableError}
        showAddButton={false}
        // A Massar part prints the Massar paper instead (the menu item above).
        showPrintButton={!massar.source}
        showViewToggle={false}
        defaultMode='table'
        renderCardSkeleton={GradeRosterCardSkeleton}
        renderCard={renderRosterCard}
        // A long press or a double tap on a student opens their menu.
        onRowLongPress={openStudentMenu}
        onRowDoubleClick={openStudentMenu}
        dynamicHeight={true}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.grades}
            title={noDataText}
          />
        )}
        renderFilteredEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.grades}
            title={t('emptyStates.filtered.title')}
            description={t('emptyStates.filtered.description')}
          />
        )}
      />
      )}
      {!isSheet ? (
        <GradeStudentMenu
          row={menuRow}
          onClose={() => setMenuStudentId(null)}
          remark={(massar.source ? menuRow?.remark : menuRow?.feedback) ?? ''}
          canRemark={!!menuRow?.editable}
          savingRemark={massar.isSavingRemark}
          onToggleAbsent={toggleAbsent}
          onClearMark={clearMark}
          onSaveRemark={saveRemark}
        />
      ) : null}
      {/* Opened from the phone's menu, and kept open when the phone turns sideways
          (where the wider screen would otherwise switch to the desktop's grid). */}
      {paperHtml !== null ? (
        <GradePaperPreview
          html={paperHtml}
          title={massarSheet ? `${massarSheet.sheet.subjectName} · ${massarSheet.round.termLabel} · ${massarSheet.round.examLabel}` : ''}
          onClose={() => setPaperHtml(null)}
        />
      ) : null}
    </div>
  );
}

export default function GradesTable() {
  return <GradesTableForYear key={useViewingYearKey()} />;
}
