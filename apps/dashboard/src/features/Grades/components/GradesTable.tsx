'use client';

import { FEATURE_ICONS } from '@/shared/featureIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { GradeDraft } from '../store/gradeDraftStore';
import { toast } from 'sonner';
import { useAuth } from 'najm-auth/client/react';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState } from 'najm-kit';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import GradesHeader from './GradesHeader';
import GradeRosterCard from './GradeRosterCard';
import { useTeacherOverview } from '@/features/Dashboard/hooks/useTeacherDashboard';
import { LoaderCircle } from 'lucide-react';
import { useGrades, useSourceGrades } from '../hooks/useGrades';
import { useMassarGrades } from '../hooks/useMassarGrades';
import { examSourcesWithMassar, massarMarkFromGrade, massarSourceLabels } from '../config/massarGradeSources';
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

const PASS_THRESHOLD = 50;
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
  const { t } = useTranslation();
  const { can } = useViewerRole();
  const { user } = useAuth();
  const role = (user as any)?.role;
  // Every exam belongs to one teacher assignment: a grade is given under the
  // exam's teacher, so class, section and subject are all there is to choose.
  const isTeacher = role === 'teacher';

  // Saving goes through useGrades; its whole-year list is never read here.
  const { submitGrades, isSubmittingBatch } = useGrades({ enabled: false });
  const { classes, isClassesLoading } = useClasses();
  const { sections, isSectionsLoading } = useSections();
  const { subjects, isSubjectsLoading } = useSubjects();
  const { teachers } = useTeachers();
  const { assessments, isAssessmentsLoading } = useAssessments({ enabled: false });
  const { exams, isExamsLoading } = useExams();

  const [classId, setClassId] = useState('all');
  const isAllClasses = classId === 'all';
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  // Exams only for now; retain the source namespace used by existing drafts.
  const [sourceType] = useState<GradeSourceType>('exam');
  const [sourceId, setSourceId] = useState('');
  const massar = useMassarGrades(sourceId, sourceType === 'exam' && can('read:massar'));
  // A Massar source is read from its grid; only School's own exams have grades to read.
  const isSchoolSource = sourceType === 'assessment' || (exams || []).some((exam) => exam.id === sourceId);
  const { data: grades, error: gradesError, isLoading: isGradesLoading } = useSourceGrades(sourceType, sourceId, isSchoolSource && !massar.source);
  const examSources = useMemo(() => examSourcesWithMassar(exams || [], massar.sources.data || []), [exams, massar.sources.data]);
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
    () => [
      { value: 'all', label: t('fees.filters.allClasses') },
      ...(classes || [])
        .filter((c) => !ownAssignments || ownAssignments.some((a) => a.classId === c.id))
        .map((c) => ({ value: c.id, label: c.name })),
    ],
    [classes, ownAssignments, t]
  );
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
  const sourceOptions = useMemo(
    () => {
      const list = sourceType === 'assessment' ? (assessments || []) : examSources;
      return list
        .filter((item) => !classId || getSourceClassId(item) === classId)
        .filter((item) => !sectionId || getSourceSectionId(item) === sectionId)
        .filter((item) => !subjectId || getSourceSubjectId(item) === subjectId)
        .map((item) => ({
          value: item.id,
          label: massarLabels.get(item.id) ?? item.title,
        }));
    },
    [assessments, examSources, massarLabels, sourceType, classId, sectionId, subjectId]
  );

  const selectedSource = useMemo(
    () => {
      const list = sourceType === 'assessment' ? (assessments || []) : examSources;
      return list.find((item) => item.id === sourceId) || null;
    },
    [assessments, examSources, sourceType, sourceId]
  );

  // School owns the displayed roster, names, codes and order for every subject.
  // The source's dated roster and Massar membership govern editing only.
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

    const ctxTeacherId = getSourceTeacherId(selectedSource);

    return list.map((s) => {
      const g = gradesByStudent.get(s.id);
      const mark = massarMarks.get(s.id);
      const hasMassarMark = !!mark && (mark.mark !== null || mark.absence === 'justified');
      const massarRowId = `${sourceId}:${s.id}`;
      return {
        rowId: s.id,
        gradeId: massar.source ? (hasMassarMark ? massarRowId : null) : g?.id || null,
        studentId: s.id,
        studentName: s.name,
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
    let highest: number | null = null;
    let lowest: number | null = null;
    for (const r of withGrade) {
      const pct = computePercent(r.marksObtained, r.totalMarks);
      if (pct == null) continue;
      if (pct >= PASS_THRESHOLD) passing++;
      if (highest == null || pct > highest) highest = pct;
      if (lowest == null || pct < lowest) lowest = pct;
    }
    const passRate = withGrade.length > 0 ? Math.round((passing / withGrade.length) * 100) : 0;
    return { total, passing, highest, lowest, passRate };
  }, [baseRoster]);

  const isMassarSource = !!massar.source;
  const editableRow = useCallback((row) => {
    // Saving does not lock the fields: what is typed meanwhile waits in the draft for the next save.
    if (isStudentsLoading || isEligibilityLoading || isMassarSheetLoading || rosterError || !selectedSource) return false;
    if (isMassarSource) return can('update:massar-marks') && !!massarSheet?.canEdit
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

  const hasChanges = Object.keys(draft).length > 0;
  const canSubmit = !!selectedSource && !isStudentsLoading && !isEligibilityLoading && !isMassarSheetLoading && !rosterError && !isSubmitting
    && (massar.source ? can('update:massar-marks') && !!massarSheet?.canEdit
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
  const gradeFilters = useGradesTableFilters({
    classId, isAllClasses, sectionId, subjectId,
    // The filter row is the deliberate half: every change made here drops the
    // chosen assessment or exam with it.
    setClassId: selectClass,
    setSectionId: selectSection,
    setSubjectId: selectSubject,
    sourceType, sourceId, setSourceId, sourceOptions,
    classOptions, sectionOptions, subjectOptions,
    isClassesLoading, isSectionsLoading, isSubjectsLoading,
    isSourceLoading: sourceType === 'assessment' ? isAssessmentsLoading : isExamsLoading || (can('read:massar') && massar.sources.isLoading),
  });
  const noDataText = !classId
    ? t('grades.toolbar.selectClass')
    : !isAllClasses && !sectionId
      ? t('grades.toolbar.selectSection')
      : t('grades.toolbar.noStudents');

  return (
    <div className='flex flex-col gap-2 w-full h-full min-h-0'>
      <NPageHeader
        icon={FEATURE_ICONS.grades}
        title={t('grades.messages.pageTitle')}
        subtitle={isCountUnknown(rosterError, roster, isTableLoading) ? undefined : `${t('grades.subtitle.count', { count: stats.total })}${selectedSource ? ` · ${selectedSource.title}` : ''}${massar.source ? ` · ${massar.source.termLabel} · ${massar.source.examLabel}` : ''}`}
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
            <GradesHeader
              stats={stats}
              failed={hasChanges && draft === failedDraft}
              onRetry={() => { setFailedDraft(null); }}
            />
          </div>
        ) : undefined}
        onCellEdit={handleCellEdit}
        loading={isTableLoading}
        error={(sourceType === 'exam' ? massar.sources.error : null) || (massar.source ? massar.sheet.error : null)
          || (hasFailedToLoad(rosterError, roster) ? rosterError : null)}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        showAddButton={false}
        showViewToggle={false}
        defaultMode='table'
        renderCardSkeleton={GradeRosterCardSkeleton}
        renderCard={renderRosterCard}
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
    </div>
  );
}

export default function GradesTable() {
  return <GradesTableForYear key={useViewingYearKey()} />;
}
