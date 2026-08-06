'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from 'najm-auth/client/react';
import { NPageHeader, NPageHeaderActions, NTable, NTabs } from 'najm-kit';
import { buildSmsColumns } from '@/lib/tableUtils';
import GradesHeader from './GradesHeader';
import { ClipboardList, FileText, GraduationCap } from 'lucide-react';
import { useGrades } from '../hooks/useGrades';
import { useStudents } from '@/features/Students/hooks/useStudents';
import { useClasses } from '@/hooks/useClasses';
import { useSections } from '@/features/Sections/hooks/useSections';
import { useSubjects } from '@/features/Subjects/hooks/useSubjects';
import { useTeachers } from '@/features/Teachers/hooks/useTeachers';
import { useAssessments } from '@/features/Assessments/hooks/useAssessments';
import { useExams } from '@/features/Exams/hooks/useExams';
import { useGradesTableColumns } from '../hooks/useGradesTableColumns';
import { useGradesTableFilters } from '../hooks/useGradesTableFilters';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';

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

function GradesTable() {
  const { user } = useAuth();
  const role = (user as any)?.role;
  const isAdminOrPrincipal = role === 'admin' || role === 'principal';

  const { grades, submitGrades, isSubmittingBatch, isGradesLoading } = useGrades();
  const { students, isStudentsLoading } = useStudents();
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

  const classOptions = useMemo(
    () => (classes || []).map((c) => ({ value: c.id, label: c.name })),
    [classes]
  );
  const sectionOptions = useMemo(
    () => (sections || [])
      .filter((s) => !classId || s.classId === classId)
      .map((s) => ({ value: s.id, label: s.name })),
    [sections, classId]
  );

  // Auto-select a default class (first one that has sections) on mount so the
  // roster is populated and NTable's filter header renders — matches the
  // Attendance roster flow instead of dead-ending on an empty table.
  useEffect(() => {
    if (classId || isClassesLoading || !classes?.length) return;
    const classWithSections = (classes || []).find((c) =>
      (sections || []).some((s) => s.classId === c.id)
    );
    setClassId((classWithSections ?? classes[0]).id);
  }, [classes, sections, isClassesLoading, classId]);

  // Keep the selected section valid for the current class, falling back to the
  // first available section when the current choice no longer applies.
  useEffect(() => {
    setSectionId((current) =>
      sectionOptions.some((o) => o.value === current) ? current : (sectionOptions[0]?.value ?? '')
    );
  }, [classId, sectionOptions]);

  useEffect(() => {
    setSourceId('');
  }, [classId, sectionId, subjectId, teacherId, sourceType]);

  // Discard unsaved edits whenever the roster context switches, so drafts never
  // leak across a different section / assessment / exam.
  useEffect(() => {
    resetDraft();
  }, [sectionId, sourceId, sourceType, resetDraft]);
  const subjectOptions = useMemo(
    () => (subjects || []).map((s) => ({
      value: s.id,
      label: s.code || s.name,
    })),
    [subjects]
  );
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
      toast.error('Select an assessment or exam before saving grades.');
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
      toast.info('Nothing to save.');
      return;
    }

    try {
      await submitGrades(payloads);
      toast.success('Grades saved.');
      resetDraft();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save grades.');
    }
  };

  const columns = useGradesTableColumns({ canEdit, onToggleStatus: handleStatusToggle });
  const rawFilters = useGradesTableFilters({
    classId, sectionId, subjectId, teacherId,
    setClassId, setSectionId, setSubjectId, setTeacherId,
    sourceType, sourceId, setSourceId, sourceOptions,
    classOptions, sectionOptions, subjectOptions, teacherOptions,
    isClassesLoading, isSectionsLoading, isSubjectsLoading, isTeachersLoading,
    isSourceLoading: sourceType === 'assessment' ? isAssessmentsLoading : isExamsLoading,
    isAdminOrPrincipal,
  });
  const noDataText = !classId
    ? 'Select a class to start.'
    : !sectionId
      ? 'Select a section to load students.'
      : 'No students found in the selected section.';

  return (
    <div className='flex flex-col gap-2 w-full h-full min-h-0'>
      <NPageHeader
        icon={GraduationCap}
        title="Grades"
        subtitle={`${stats.total} students${selectedSource ? ` · ${selectedSource.title}` : ''}`}
      >
        <NPageHeaderActions>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <NTabs
              value={sourceType}
              onValueChange={(value) => setSourceType(value as GradeSourceType)}
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
              items={[
                { value: 'assessment', label: 'Assessment', icon: ClipboardList, content: null },
                { value: 'exam', label: 'Exam', icon: FileText, content: null },
              ]}
            />
          </div>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        className='min-h-0 flex-1'
        data={roster}
        columns={buildSmsColumns(columns, { onCellEdit: handleCellEdit })}
        filters={rawFilters}
        headerSlot={(
          <GradesHeader
            stats={stats}
            hasChanges={hasChanges}
            isSubmitting={isSubmittingBatch}
            onReset={resetDraft}
            onSubmit={handleSubmit}
            canSubmit={canSubmit}
            submitTitle={canSubmit ? 'Save grades' : 'Select an assessment or exam first'}
          />
        )}
        onCellEdit={handleCellEdit}
        loading={isGradesLoading || isStudentsLoading}
        showAddButton={false}
        showViewToggle={false}
        defaultMode='table'
        dynamicHeight={true}
        noDataText={noDataText}
      />
    </div>
  );
}

export default GradesTable;
