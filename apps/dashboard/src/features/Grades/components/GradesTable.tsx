'use client';

import { FEATURE_ICONS } from '@/shared/featureIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from 'najm-auth/client/react';
import { NPageHeader, NPageHeaderActions, NTabs, NErrorState, NForbiddenState, NEmptyState, NTable, useMediaQuery } from 'najm-kit';
import GradesHeader from './GradesHeader';
import GradeRosterCard from './GradeRosterCard';
import { useTeacherOverview } from '@/features/Dashboard/hooks/useTeacherDashboard';
import { ClipboardList, FileText, GraduationCap, SearchX } from 'lucide-react';
import { useGrades } from '../hooks/useGrades';
import { useStudentsOnDate } from '@/features/Students/hooks/useStudents';
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
import { useTranslation } from 'najm-i18n/react';

const PASS_THRESHOLD = 50;
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

const teacherMatchesAcademicFilter = (teacher, filters: { classId: string; sectionId: string; subjectId: string }) => {
  const assignments = Array.isArray(teacher?.assignments) ? teacher.assignments : [];
  if (!filters.classId && !filters.sectionId && !filters.subjectId) return true;

  return assignments.some((assignment) => {
    const subjectIds = Array.isArray(assignment?.subjectIds) ? assignment.subjectIds : [];
    const sectionIds = Array.isArray(assignment?.sectionIds) ? assignment.sectionIds : [];
    const matchesClass = !filters.classId || assignment?.classId === filters.classId;
    const matchesSection = !filters.sectionId || sectionIds.includes(filters.sectionId);
    const matchesSubject = !filters.subjectId || subjectIds.includes(filters.subjectId);
    return matchesClass && matchesSection && matchesSubject;
  });
};

const resolveGradeStatus = (marksObtained, fallback = 'pending') => {
  if (fallback === 'missed') return 'missed';
  return marksObtained == null || marksObtained === '' ? 'pending' : 'graded';
};

function GradesTableForYear() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const role = (user as any)?.role;
  const isAdminOrPrincipal = role === 'admin' || role === 'principal';
  const isTeacher = role === 'teacher';

  const { grades, error: gradesError, submitGrades, isSubmittingBatch, isGradesLoading } = useGrades();
  const { classes, isClassesLoading } = useClasses();
  const { sections, isSectionsLoading } = useSections();
  const { subjects, isSubjectsLoading } = useSubjects();
  const { teachers, isTeachersLoading } = useTeachers();
  const { assessments, isAssessmentsLoading } = useAssessments();
  const { exams, isExamsLoading } = useExams();

  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [sourceType, setSourceType] = useState<GradeSourceType>('assessment');
  const [sourceId, setSourceId] = useState('');

  // Draft of unsaved edits keyed by studentId. Cell edits and status toggles
  // land here instead of hitting the API, so the user can review everything and
  // then persist the whole roster with a single Save button (like Attendance).
  const [draft, setDraft] = useState<Record<string, { marksObtained?: any; status?: string; feedback?: string }>>({});
  const resetDraft = useCallback(() => setDraft({}), []);

  // A teacher grades only what they teach: their own assignments narrow the
  // class, section and subject choices. Other roles see every option.
  const { data: ownOverview } = useTeacherOverview(undefined, isTeacher);
  const ownAssignments = useMemo(() => {
    if (!isTeacher) return null;
    const self = (teachers || []).find((tc) => tc.id === ownOverview?.teacher.id);
    return Array.isArray(self?.assignments) ? self.assignments : [];
  }, [isTeacher, teachers, ownOverview]);

  const classOptions = useMemo(
    () => (classes || [])
      .filter((c) => !ownAssignments || ownAssignments.some((a) => a.classId === c.id))
      .map((c) => ({ value: c.id, label: c.name })),
    [classes, ownAssignments]
  );
  const sectionOptions = useMemo(
    () => (sections || [])
      .filter((s) => !classId || s.classId === classId)
      .filter((s) => !ownAssignments || ownAssignments.some((a) => a.classId === s.classId && a.sectionIds?.includes(s.id)))
      .map((s) => ({ value: s.id, label: s.name })),
    [sections, classId, ownAssignments]
  );

  // Auto-select a default class (first one that has sections) on mount so the
  // roster is populated and NTable's filter header renders — matches the
  // Attendance roster flow instead of dead-ending on an empty table.
  useEffect(() => {
    if (classId || isClassesLoading || !classOptions.length) return;
    const classWithSections = classOptions.find((option) =>
      (sections || []).some((s) => s.classId === option.value)
    );
    setClassId((classWithSections ?? classOptions[0]).value);
  }, [classOptions, sections, isClassesLoading, classId]);

  // Keep the selected section valid for the current class, falling back to the
  // first available section when the current choice no longer applies.
  useEffect(() => {
    setSectionId((current) =>
      sectionOptions.some((o) => o.value === current) ? current : (sectionOptions[0]?.value ?? '')
    );
  }, [classId, sectionOptions]);

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
  const selectClass = useCallback((value: string) => { setClassId(value); clearSource(); }, [clearSource]);
  const selectSection = useCallback((value: string) => { setSectionId(value); clearSource(); }, [clearSource]);
  const selectSubject = useCallback((value: string) => { setSubjectId(value); clearSource(); }, [clearSource]);
  const selectTeacher = useCallback((value: string) => { setTeacherId(value); clearSource(); }, [clearSource]);
  const selectSourceType = useCallback((value: GradeSourceType) => {
    setSourceType(value);
    clearSource();
  }, [clearSource]);

  // Discard unsaved edits whenever the roster context switches, so drafts never
  // leak across a different section / assessment / exam.
  useEffect(() => {
    resetDraft();
  }, [sectionId, sourceId, sourceType, resetDraft]);
  const subjectOptions = useMemo(
    () => (subjects || [])
      .filter((s) => !ownAssignments || ownAssignments.some((a) =>
        (!classId || a.classId === classId)
        && (!sectionId || a.sectionIds?.includes(sectionId))
        && a.subjectIds?.includes(s.id)))
      .map((s) => ({
        value: s.id,
        label: s.code || s.name,
      })),
    [subjects, ownAssignments, classId, sectionId]
  );

  // A teacher opens on a subject they teach in the chosen section.
  useEffect(() => {
    if (!ownAssignments) return;
    setSubjectId((current) =>
      subjectOptions.some((option) => option.value === current) ? current : (subjectOptions[0]?.value ?? '')
    );
  }, [ownAssignments, subjectOptions]);
  const teacherOptions = useMemo(
    () => (teachers || [])
      .filter((tc) => teacherMatchesAcademicFilter(tc, { classId, sectionId, subjectId }))
      .map((tc) => ({
        value: tc.id,
        label: tc.name || tc.email || tc.id,
      })),
    [teachers, classId, sectionId, subjectId]
  );

  useEffect(() => {
    if (!teacherId) return;
    if (!teacherOptions.some((option) => option.value === teacherId)) {
      setTeacherId('');
    }
  }, [teacherId, teacherOptions]);

  const sourceOptions = useMemo(
    () => {
      const list = sourceType === 'assessment' ? (assessments || []) : (exams || []);
      return list
        .filter((item) => !classId || getSourceClassId(item) === classId)
        .filter((item) => !sectionId || getSourceSectionId(item) === sectionId)
        .filter((item) => !subjectId || getSourceSubjectId(item) === subjectId)
        .filter((item) => !teacherId || getSourceTeacherId(item) === teacherId)
        .map((item) => ({
          value: item.id,
          label: `${item.title}${item.totalMarks ? ` /${item.totalMarks}` : ''}`,
        }));
    },
    [assessments, exams, sourceType, classId, sectionId, subjectId, teacherId]
  );

  const selectedSource = useMemo(
    () => {
      const list = sourceType === 'assessment' ? (assessments || []) : (exams || []);
      return list.find((item) => item.id === sourceId) || null;
    },
    [assessments, exams, sourceType, sourceId]
  );

  // With a viewing year, a chosen source's roster is the students placed in
  // the section on its date, the placement the server checks when saving.
  const { students, error: studentsError, isStudentsLoading } = useStudentsOnDate(selectedSource?.date);

  useEffect(() => {
    if (!selectedSource) return;
    const selectedClassId = getSourceClassId(selectedSource);
    const selectedSectionId = getSourceSectionId(selectedSource);
    const selectedSubjectId = getSourceSubjectId(selectedSource);
    const selectedTeacherId = getSourceTeacherId(selectedSource);

    if (selectedClassId && !classId) setClassId(selectedClassId);
    if (selectedSectionId && !sectionId) setSectionId(selectedSectionId);
    if (selectedSubjectId && !subjectId) setSubjectId(selectedSubjectId);
    if (isAdminOrPrincipal && selectedTeacherId && !teacherId) {
      setTeacherId(selectedTeacherId);
    }
  }, [selectedSource]); // eslint-disable-line react-hooks/exhaustive-deps

  const baseRoster = useMemo(() => {
    if (!sectionId) return [];
    const list = (students || []).filter((s) => s.sectionId === sectionId);

    const gradesByStudent = new Map<string, any>();
    if (sourceId) {
      for (const g of grades || []) {
        const matchesSource = sourceType === 'assessment'
          ? g.assessmentId === sourceId
          : g.examId === sourceId;
        if (matchesSource) gradesByStudent.set(g.studentId, g);
      }
    }

    const ctxTeacherId = isAdminOrPrincipal
      ? (getSourceTeacherId(selectedSource) || teacherId)
      : getSourceTeacherId(selectedSource);

    return list.map((s) => {
      const g = gradesByStudent.get(s.id);
      return {
        rowId: g?.id || `new-${s.id}`,
        gradeId: g?.id || null,
        studentId: s.id,
        studentName: s.name,
        studentCode: s.studentCode,
        studentImage: s.image,
        studentUpdatedAt: s.updatedAt,
        gender: s.gender,
        phone: s.phone,
        className: s.class?.name,
        sectionName: s.section?.name,
        marksObtained: g?.marksObtained ?? null,
        status: g?.status ?? 'pending',
        feedback: g?.feedback ?? '',
        assessmentId: sourceType === 'assessment' ? (sourceId || null) : null,
        examId: sourceType === 'exam' ? (sourceId || null) : null,
        classId: getSourceClassId(selectedSource) || classId || null,
        sectionId: s.sectionId || sectionId || null,
        subjectId: getSourceSubjectId(selectedSource) || subjectId || null,
        teacherId: ctxTeacherId || null,
        totalMarks: selectedSource?.totalMarks ?? null,
      };
    });
  }, [students, classId, sectionId, grades, sourceId, sourceType, selectedSource, teacherId, isAdminOrPrincipal, subjectId]);

  // Overlay any pending draft edits on top of the saved roster so the table
  // reflects unsaved changes immediately.
  const roster = useMemo(
    () => baseRoster.map((r) => {
      const d = draft[r.studentId];
      return d ? { ...r, ...d } : r;
    }),
    [baseRoster, draft]
  );

  const stats = useMemo(() => {
    const withGrade = roster.filter((r) => r.gradeId);
    const total = roster.length;
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
  }, [roster]);

  const canEdit = (row) =>
    !!sourceId &&
    (!!row.assessmentId || !!row.examId) &&
    !!row.classId &&
    !!row.sectionId &&
    !!row.subjectId &&
    !!row.teacherId;

  const applyDraft = useCallback((studentId: string, patch: Record<string, any>) => {
    setDraft((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }));
  }, []);

  const handleCellEdit = async (row, columnId, value) => {
    if (columnId === 'marksObtained') {
      applyDraft(row.studentId, { marksObtained: value, status: resolveGradeStatus(value) });
    } else if (columnId === 'feedback') {
      applyDraft(row.studentId, { feedback: value });
    }
  };

  const handleStatusToggle = (row) => {
    const currentStatus = row.status || 'pending';
    if (currentStatus !== 'pending' && currentStatus !== 'missed') return;
    const nextStatus = currentStatus === 'pending' ? 'missed' : 'pending';
    applyDraft(row.studentId, { status: nextStatus });
  };

  const hasChanges = Object.keys(draft).length > 0;
  const canSubmit = !!sourceId;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error(t('grades.errors.selectSource'));
      return;
    }

    const payloads = Object.keys(draft)
      .map((studentId) => baseRoster.find((r) => r.studentId === studentId))
      .filter((base): base is any => !!base && canEdit(base))
      .map((base) => {
        const merged = { ...base, ...draft[base.studentId] };
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

    if (payloads.length === 0) {
      toast.info(t('grades.messages.nothingToSave'));
      return;
    }

    try {
      await submitGrades(payloads);
      toast.success(t('grades.success.saved'));
      resetDraft();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || t('grades.errors.saveFailed'));
    }
  };

  const columns = useGradesTableColumns({ canEdit, onToggleStatus: handleStatusToggle });
  const renderRosterCard = (props: any) => (
    <GradeRosterCard {...props} canEdit={canEdit} onEdit={handleCellEdit} onToggleStatus={handleStatusToggle} />
  );
  // The server cannot know the screen width: offering cards only after mount
  // keeps the first client render equal to the server's table, then phones
  // switch to cards.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Below `md` NTable shows only its first filter and folds the rest behind a
  // button. On a phone that one visible picker is the assessment or exam:
  // class and section are already chosen for the teacher, and nothing can be
  // graded until a source is picked.
  const isPhone = useMediaQuery('(max-width: 767px)');
  const gradeFilters = useGradesTableFilters({
    classId, sectionId, subjectId, teacherId,
    // The filter row is the deliberate half: every change made here drops the
    // chosen assessment or exam with it.
    setClassId: selectClass,
    setSectionId: selectSection,
    setSubjectId: selectSubject,
    setTeacherId: selectTeacher,
    sourceType, sourceId, setSourceId, sourceOptions,
    classOptions, sectionOptions, subjectOptions, teacherOptions,
    isClassesLoading, isSectionsLoading, isSubjectsLoading, isTeachersLoading,
    isSourceLoading: sourceType === 'assessment' ? isAssessmentsLoading : isExamsLoading,
    isAdminOrPrincipal,
  });
  const rawFilters = useMemo(
    () => (isPhone
      ? [...gradeFilters.filter((f) => f.name === 'source'), ...gradeFilters.filter((f) => f.name !== 'source')]
      : gradeFilters),
    [gradeFilters, isPhone]
  );
  // The class, section and subject pickers sit behind the filter button on a
  // phone, so say which roster is on screen: "Quiz 1" names an assessment in
  // several sections.
  const phoneContext = isPhone
    ? [
      classOptions.find((o) => o.value === classId)?.label,
      sectionOptions.find((o) => o.value === sectionId)?.label,
      subjectOptions.find((o) => o.value === subjectId)?.label,
    ].filter(Boolean).join(' · ')
    : '';
  const noDataText = !classId
    ? t('grades.toolbar.selectClass')
    : !sectionId
      ? t('grades.toolbar.selectSection')
      : t('grades.toolbar.noStudents');

  return (
    <div className='flex flex-col gap-2 w-full h-full min-h-0'>
      <NPageHeader
        icon={GraduationCap}
        title={t('grades.messages.pageTitle')}
        subtitle={isCountUnknown(gradesError ?? studentsError, roster, isGradesLoading || isStudentsLoading) ? undefined : `${t('grades.subtitle.count', { count: stats.total })}${selectedSource ? ` · ${selectedSource.title}` : ''}`}
      >
        <NPageHeaderActions>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <NTabs
              value={sourceType}
              onValueChange={(value) => selectSourceType(value as GradeSourceType)}
              color="primary"
              classNames={{
                list: 'h-9 rounded-md bg-primary/10 p-0.5',
                trigger: 'h-8 rounded px-3 text-xs font-medium data-[state=active]:text-primary-foreground',
              }}
              styles={{
                activeTrigger: {
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                },
              }}
              // Icons only at phone width, where the labels left no room for the
              // title; the labels stay readable to screen readers.
              items={[
                { value: 'assessment', label: <span className="max-sm:sr-only">{t('grades.form.assessment')}</span>, icon: ClipboardList, content: null },
                { value: 'exam', label: <span className="max-sm:sr-only">{t('grades.toolbar.exam')}</span>, icon: FileText, content: null },
              ]}
            />
          </div>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        className='min-h-0 flex-1'
        data={roster}
        columns={columns}
        filters={rawFilters}
        // On a phone the stats and Save take their own full-width row under
        // the picker instead of hugging the right edge.
        classNames={{ header: 'max-md:gap-y-2 max-md:[&>div:has(>.grades-stats)]:w-full' }}
        // Highest, lowest and pass rate describe one assessment or exam; with
        // none chosen they would only read as dashes and 0%.
        headerSlot={(phoneContext || sourceId) ? (
          <div className="grades-stats flex w-full flex-col gap-2">
            {phoneContext ? <p className="truncate px-1 text-xs text-muted-foreground">{phoneContext}</p> : null}
            {sourceId ? (
              <GradesHeader
                stats={stats}
                hasChanges={hasChanges}
                isSubmitting={isSubmittingBatch}
                onSubmit={handleSubmit}
                canSubmit={canSubmit}
                submitTitle={canSubmit ? t('grades.toolbar.save') : t('grades.toolbar.selectSource')}
              />
            ) : null}
          </div>
        ) : undefined}
        onCellEdit={handleCellEdit}
        loading={isGradesLoading || isStudentsLoading}
        error={hasFailedToLoad(gradesError ?? studentsError, roster) ? gradesError ?? studentsError : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        showAddButton={false}
        showViewToggle={false}
        defaultMode='table'
        renderCard={mounted ? renderRosterCard : undefined}
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
            icon={SearchX}
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
