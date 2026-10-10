'use client';

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { NPageHeader, NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState, NTable } from 'najm-kit';
import { CalendarCheck, SearchX } from 'lucide-react';
import RosterHeader from './RosterHeader';
import RosterFilters from './RosterFilters';
import { filterRoster } from '../config/filterRoster';
import RosterCard from './RosterCard';
import { useStudentAttendance } from '../hooks/useAttendance';
import { useAttendanceRoster } from '../hooks/useAttendanceRoster';
import { useStudentRosterColumns } from '../hooks/useAttendanceTableColumns';
import { useStudentsOnDate } from '@/features/Students/hooks/useStudents';
import { useSections } from '@/features/Sections/hooks/useSections';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { useTranslation } from 'najm-i18n/react';
import * as sectionApi from '@/services/sectionApi';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';
import { useViewingYearDate, useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { useSchoolToday } from '@/hooks/useSchoolFormat';

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

function StudentAttendanceTableForYear() {
  const { t } = useTranslation();
  const { sections, isSectionsLoading } = useSections();
  const { classes, isClassesLoading } = useClasses();
  const { attendance, submitRoster, isSubmittingRoster } = useStudentAttendance();
  // Marks are read for the viewed year only, so the register stays on its days.
  const [selectedDate, setSelectedDate] = useViewingYearDate(useSchoolToday());
  // With a viewing year the register lists the students enrolled and placed on
  // that day, in that day's section.
  const { students, error: studentsError, isStudentsLoading } = useStudentsOnDate(selectedDate);
  const { publicSettings } = usePublicSettings();
  const attendanceMode: 'daily' | 'per_class' = (publicSettings?.attendanceMode as 'daily' | 'per_class') || 'daily';
  const isDailyMode = attendanceMode === 'daily';
  // A lesson link (the teacher dashboard's "Take attendance") opens the
  // register on that class, section and assignment once they are listed.
  const searchParams = useSearchParams();
  const requestedSectionId = searchParams.get('sectionId') ?? '';
  const requestedAssignmentId = searchParams.get('assignmentId') ?? '';
  const [selectedClassId, setSelectedClassId] = useState(() => searchParams.get('classId') ?? 'all');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
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

    setSelectedAssignmentId((current) => {
      const listed = (id: string) => sectionAssignments.some((assignment) => assignment.teacherAssignmentId === id);
      if (listed(current)) return current;
      return listed(requestedAssignmentId) ? requestedAssignmentId : '';
    });
  }, [selectedSectionId, sectionAssignments, requestedAssignmentId]);

  const selectedAssignment = useMemo(
    () => sectionAssignments.find((assignment) => assignment.teacherAssignmentId === selectedAssignmentId) ?? null,
    [sectionAssignments, selectedAssignmentId],
  );

  const classOptions = useMemo(
    () => [
      { value: 'all', label: t('attendance.roster.allClasses') },
      ...(classes || []).map((cls) => ({ value: cls.id, label: cls.name })),
    ],
    [classes, t],
  );

  useEffect(() => {
    if (isClassesLoading || !classes?.length) {
      return;
    }
    if (selectedClassId === 'all' || classes.some((cls) => cls.id === selectedClassId)) {
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
      const listed = (id: string) => sectionOptions.some((section) => section.value === id);
      if (listed(current)) {
        return current;
      }
      if (listed(requestedSectionId)) {
        return requestedSectionId;
      }

      return sectionOptions[0]?.value ?? '';
    });
  }, [selectedClassId, sectionOptions, isAllClasses, requestedSectionId]);

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
    selectedDate,
    onDateChange: setSelectedDate,
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

  // Below `NTable`'s card breakpoint the nine-column register is unusable — it
  // compresses rather than scrolls — so the same roster row is handed a card
  // that keeps the student legible and the marks tappable. Memoised because
  // `NTable` treats the renderer as a component type: a new identity each
  // render would remount every card and drop the press it was handling.
  const renderRosterCard = useCallback(
    (props: any) => (
      <RosterCard
        {...props}
        getStatus={roster.getStatus}
        setStatus={roster.setStatus}
        detail={[
          props.data?.studentCode,
          [props.data?.class?.name, props.data?.section?.name].filter(Boolean).join(' - '),
        ].filter(Boolean).join(' | ')}
      />
    ),
    [roster.getStatus, roster.setStatus],
  );
  const visibleStudents = useMemo(
    () => filterRoster(filteredStudents, { search, status }, roster.getStatus),
    [filteredStudents, search, status, roster.getStatus],
  );
  const resetFilters = () => {
    setSelectedClassId('all');
    setSearch('');
    setStatus('');
  };

  const filters = useMemo(
    () => [
      {
        name: 'class',
        label: t('attendance.roster.class'),
        type: 'combobox',
        placeholder: isClassesLoading ? t('attendance.roster.loading') : t('attendance.roster.class'),
        value: selectedClassId,
        onChange: setSelectedClassId,
        options: classOptions,
        disabled: isClassesLoading || classOptions.length === 0,
      },
      {
        name: 'section',
        label: t('attendance.roster.section'),
        type: 'select',
        placeholder: isAllClasses
          ? t('common.all')
          : !selectedClassId
            ? t('attendance.roster.selectClass')
            : isSectionsLoading
              ? t('attendance.roster.loading')
              : sectionOptions.length === 0
                ? t('attendance.roster.noSections')
                : t('attendance.roster.section'),
        value: selectedSectionId,
        onChange: setSelectedSectionId,
        options: sectionOptions,
        disabled: isAllClasses || !selectedClassId || isSectionsLoading || sectionOptions.length === 0,
      },
      ...(isDailyMode
        ? []
        : [{
            name: 'assignment',
            label: t('attendance.roster.teacherSubject'),
            type: 'combobox',
            placeholder: !selectedSectionId
              ? t('attendance.roster.selectSection')
              : isAssignmentsLoading
                ? t('attendance.roster.loading')
                : assignmentOptions.length === 0
                  ? t('attendance.roster.noAssignments')
                  : t('attendance.roster.teacherSubject'),
            value: selectedAssignmentId,
            onChange: setSelectedAssignmentId,
            options: assignmentOptions,
            disabled: !selectedSectionId || isAssignmentsLoading || assignmentOptions.length === 0,
          }]),
      {
        name: 'date',
        label: t('attendance.roster.date'),
        type: 'date',
        placeholder: t('attendance.roster.date'),
        value: roster.selectedDate,
        onChange: roster.goToDate,
      },
      {
        name: 'name',
        label: t('attendance.roster.search'),
        value: search,
        onChange: setSearch,
        placeholder: t('attendance.roster.searchPlaceholder'),
        type: 'text',
      },
      {
        name: 'status',
        label: t('attendance.roster.status'),
        value: status,
        onChange: setStatus,
        placeholder: t('attendance.roster.status'),
        type: 'select',
        options: [
          { value: '', label: t('common.all') },
          { value: 'present', label: t('attendance.roster.present') },
          { value: 'absent', label: t('attendance.roster.absent') },
          { value: 'late', label: t('attendance.roster.late') },
        ],
      },
    ],
    [
      search,
      status,
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
      ? t('attendance.roster.selectSection')
      : !isDailyMode && !selectedAssignmentId
        ? t('attendance.errors.selectTeacherSubject')
        : t('attendance.roster.submit');
  const noDataText = isAllClasses
    ? t('attendance.roster.noStudents')
    : selectedSectionId
      ? t('attendance.roster.noStudentsInSection')
      : selectedClassId
        ? t('attendance.roster.selectSection')
        : t('attendance.roster.selectClass');

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <NPageHeader
        icon={CalendarCheck}
        title={t('navigation.studentAttendance')}
        subtitle={isCountUnknown(studentsError, filteredStudents, isStudentsLoading || isSectionsLoading || isClassesLoading) ? undefined : t('attendance.subtitle.studentCount', { count: filteredStudents.length })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <RosterFilters
        filters={filters}
        onReset={resetFilters}
        canReset={!isAllClasses || !!search || !!status}
      >
        <RosterHeader
          hasChanges={roster.hasChanges}
          isSubmitting={isSubmitting}
          stats={roster.stats}
          onSubmit={roster.handleSubmit}
          canSubmit={canSubmit && filteredStudents.length > 0 && !isStudentsLoading}
          submitTitle={submitTitle}
        />
      </RosterFilters>

      <NTable
        responsiveSkeleton
        data={visibleStudents}
        isFilteredEmpty={filteredStudents.length > 0 && visibleStudents.length === 0}
        columns={columns}
        loading={isStudentsLoading || isSectionsLoading || isClassesLoading}
        error={hasFailedToLoad(studentsError, filteredStudents) ? studentsError : null}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        showAddButton={false}
        showCheckbox
        showViewToggle={false}
        defaultMode='table'
        renderCard={renderRosterCard}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.studentAttendance}
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

export default function StudentAttendanceTable() {
  return <StudentAttendanceTableForYear key={useViewingYearKey()} />;
}
