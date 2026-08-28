'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { CalendarCheck } from 'lucide-react';
import RosterHeader from './RosterHeader';
import { useStudentAttendance } from '../hooks/useAttendance';
import { useAttendanceRoster } from '../hooks/useAttendanceRoster';
import { useStudentRosterColumns } from '../hooks/useAttendanceTableColumns';
import { useStudents } from '@/features/Students/hooks/useStudents';
import { useSections } from '@/features/Sections/hooks/useSections';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { useTranslation } from '@/hooks/useLanguage';
import * as sectionApi from '@/services/sectionApi';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';

type SectionTeacherAssignment = {
  id: string;
  name: string;
  teacherAssignmentId: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
};

const getSectionClassId = (section: any) => section?.classId ?? section?.class?.id ?? '';
const getStudentSectionId = (student: any) => student?.sectionId ?? student?.section?.id ?? '';

function StudentAttendanceTable() {
  const { t } = useTranslation();
  const { students, isStudentsLoading } = useStudents();
  const { sections, isSectionsLoading } = useSections();
  const { classes, isClassesLoading } = useClasses();
  const { attendance, submitRoster, isSubmittingRoster } = useStudentAttendance();
  const { publicSettings } = usePublicSettings();
  const attendanceMode: 'daily' | 'per_class' = (publicSettings?.attendanceMode as 'daily' | 'per_class') || 'daily';
  const isDailyMode = attendanceMode === 'daily';
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const isAllClasses = selectedClassId === 'all';

  const { data: sectionTeachersResponse, isLoading: isAssignmentsLoading } = useQuery({
    queryKey: ['sections', selectedSectionId, 'teachers'],
    queryFn: () => sectionApi.getSectionTeachersApi(selectedSectionId) as Promise<{ data: SectionTeacherAssignment[] }>,
    enabled: !!selectedSectionId && !isDailyMode,
  });

  const sectionAssignments = useMemo(
    () => (sectionTeachersResponse?.data ?? []) as SectionTeacherAssignment[],
    [sectionTeachersResponse?.data],
  );

  useEffect(() => {
    if (!selectedSectionId) {
      setSelectedAssignmentId('');
      return;
    }

    if (sectionAssignments.length === 1) {
      setSelectedAssignmentId(sectionAssignments[0].teacherAssignmentId);
      return;
    }

    setSelectedAssignmentId((current) =>
      sectionAssignments.some((assignment) => assignment.teacherAssignmentId === current) ? current : ''
    );
  }, [selectedSectionId, sectionAssignments]);

  const selectedAssignment = useMemo(
    () => sectionAssignments.find((assignment) => assignment.teacherAssignmentId === selectedAssignmentId) ?? null,
    [sectionAssignments, selectedAssignmentId],
  );

  const classOptions = useMemo(
    () => [
      { value: 'all', label: t('common.all') },
      ...(classes || []).map((cls) => ({ value: cls.id, label: cls.name })),
    ],
    [classes, t],
  );

  useEffect(() => {
    if (selectedClassId || isClassesLoading || !classes?.length) {
      return;
    }

    const classWithSections = classes.find((cls) => cls.sections?.length);
    setSelectedClassId((classWithSections ?? classes[0]).id);
  }, [classes, isClassesLoading, selectedClassId]);

  const sectionOptions = useMemo(
    () => {
      if (!selectedClassId || isAllClasses) {
        return [];
      }

      const selectedClass = (classes || []).find((cls) => cls.id === selectedClassId);
      const combinedSections = [
        ...(sections || []).filter((section) => getSectionClassId(section) === selectedClassId),
        ...((selectedClass?.sections || []).map((section) => ({ ...section, classId: selectedClassId }))),
      ];
      const uniqueSections = Array.from(
        new Map(combinedSections.filter((section) => section?.id).map((section) => [section.id, section])).values(),
      );

      return uniqueSections.map((section) => ({ value: section.id, label: section.name }));
    },
    [sections, classes, selectedClassId, isAllClasses],
  );

  useEffect(() => {
    if (isAllClasses) {
      setSelectedSectionId('');
      return;
    }

    if (!selectedClassId) {
      setSelectedSectionId('');
      return;
    }

    setSelectedSectionId((current) => {
      if (sectionOptions.some((section) => section.value === current)) {
        return current;
      }

      return sectionOptions[0]?.value ?? '';
    });
  }, [selectedClassId, sectionOptions, isAllClasses]);

  const assignmentOptions = useMemo(
    () =>
      sectionAssignments.map((assignment) => ({
        value: assignment.teacherAssignmentId,
        label: `${assignment.name} - ${assignment.subjectName}${assignment.subjectCode ? ` (${assignment.subjectCode})` : ''}`,
      })),
    [sectionAssignments],
  );

  const filteredStudents = useMemo(
    () => isAllClasses
      ? (students || [])
      : selectedSectionId
        ? (students || []).filter((student) => getStudentSectionId(student) === selectedSectionId)
        : [],
    [students, selectedSectionId, isAllClasses],
  );

  const roster = useAttendanceRoster({
    kind: 'student',
    roster: filteredStudents,
    existingAttendance: attendance || [],
    onSubmitBatch: submitRoster,
    attendanceMode,
    allSections: isAllClasses,
    studentContext: !isAllClasses && selectedSectionId
      ? {
          sectionId: selectedSectionId,
          teacherId: selectedAssignment?.id,
          subjectId: selectedAssignment?.subjectId,
          teacherAssignmentId: selectedAssignment?.teacherAssignmentId,
        }
      : null,
  });
  const { resetDraft } = roster;

  useEffect(() => {
    resetDraft();
  }, [selectedSectionId, selectedAssignmentId, resetDraft]);

  const columns = useStudentRosterColumns({ getStatus: roster.getStatus, setStatus: roster.setStatus });
  const filters = useMemo(
    () => [
      {
        name: 'class',
        type: 'combobox',
        placeholder: isClassesLoading ? 'Loading classes...' : t('attendance.roster.class'),
        value: selectedClassId,
        onChange: setSelectedClassId,
        options: classOptions,
        disabled: isClassesLoading || classOptions.length === 0,
        className: 'w-full lg:w-32',
      },
      {
        name: 'section',
        type: 'select',
        placeholder: isAllClasses
          ? t('common.all')
          : !selectedClassId
            ? 'Select a class first'
            : isSectionsLoading
              ? 'Loading sections...'
              : sectionOptions.length === 0
                ? 'No sections'
                : t('attendance.roster.section'),
        value: selectedSectionId,
        onChange: setSelectedSectionId,
        options: sectionOptions,
        disabled: isAllClasses || !selectedClassId || isSectionsLoading || sectionOptions.length === 0,
        className: 'w-full lg:w-28',
      },
      ...(isDailyMode
        ? []
        : [{
            name: 'assignment',
            type: 'combobox',
            placeholder: !selectedSectionId
              ? 'Select a section first'
              : isAssignmentsLoading
                ? 'Loading assignments...'
                : assignmentOptions.length === 0
                  ? 'No teacher assignments'
                  : 'Teacher & Subject',
            value: selectedAssignmentId,
            onChange: setSelectedAssignmentId,
            options: assignmentOptions,
            disabled: !selectedSectionId || isAssignmentsLoading || assignmentOptions.length === 0,
            className: 'w-full lg:w-48',
          }]),
      {
        name: 'date',
        type: 'date',
        placeholder: t('attendance.roster.date'),
        value: roster.selectedDate,
        onChange: roster.goToDate,
        className: 'w-full lg:w-40',
      },
      {
        name: 'name',
        placeholder: t('attendance.roster.searchPlaceholder'),
        type: 'text',
        className: 'w-full lg:w-64',
      },
      {
        name: 'status',
        placeholder: t('attendance.roster.status'),
        type: 'select',
        options: [
          { value: 'present', label: t('attendance.roster.present') },
          { value: 'absent', label: t('attendance.roster.absent') },
          { value: 'late', label: t('attendance.roster.late') },
        ],
        className: 'w-full lg:w-32',
      },
    ],
    [
      roster.goToDate,
      roster.selectedDate,
      t,
      isDailyMode,
      selectedClassId,
      selectedSectionId,
      selectedAssignmentId,
      classOptions,
      sectionOptions,
      assignmentOptions,
      isClassesLoading,
      isSectionsLoading,
      isAssignmentsLoading,
      isAllClasses,
    ],
  );
  const isSubmitting = isSubmittingRoster || (!isDailyMode && isAssignmentsLoading);
  const canSubmit = isAllClasses || (!!selectedSectionId && (isDailyMode || !!selectedAssignmentId));
  const submitTitle = isAllClasses
    ? t('attendance.roster.submit')
    : !selectedSectionId
      ? 'Select a section first'
      : !isDailyMode && !selectedAssignmentId
        ? 'Select a teacher & subject first'
        : t('attendance.roster.submit');
  const noDataText = isAllClasses
    ? 'No students found.'
    : selectedSectionId
      ? 'No students found in the selected section.'
      : selectedClassId
        ? 'Select a section to start marking student attendance.'
        : 'Select a class and section to start marking student attendance.';

  return (
    <div className="flex flex-col gap-2 h-full">
      <NPageHeader
        icon={CalendarCheck}
        title={t('navigation.studentAttendance')}
        subtitle={t('attendance.subtitle.studentCount', { count: filteredStudents.length })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={filteredStudents}
        columns={columns}
        filters={filters}
        headerSlot={
          <RosterHeader
            hasChanges={roster.hasChanges}
            isSubmitting={isSubmitting}
            stats={roster.stats}
            onReset={resetDraft}
            onSubmit={roster.handleSubmit}
            canSubmit={canSubmit}
            submitTitle={submitTitle}
          />
        }
        loading={isStudentsLoading || isSectionsLoading || isClassesLoading}
        showAddButton={false}
        showCheckbox
        showViewToggle={false}
        defaultMode='table'
        noDataText={noDataText}
      />
    </div>
  );
}

export default StudentAttendanceTable;
