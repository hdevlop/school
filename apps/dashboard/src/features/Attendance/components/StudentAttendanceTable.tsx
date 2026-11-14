'use client';

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState } from 'najm-kit';
import { SchoolTable as NTable } from '@/components/SchoolTable';

import RosterHeader, { RosterStats } from './RosterHeader';
import { HeaderActionsMenu } from '@/components/HeaderActionsMenu';
import RosterMobileSubmit from './RosterMobileSubmit';
import RosterPrintMenu from './RosterPrintMenu';
import RosterFilters from './RosterFilters';
import { RosterCardSkeleton, ROSTER_LOADING_TABLE_HEADER } from './RosterLoading';
import { filterRoster } from '../config/filterRoster';
import { parseStudentRosterImport, STUDENT_ROSTER_IMPORT_COLUMNS } from '../config/studentRosterImport';
import { orderByCycle, type RosterPrintChoice } from '../config/rosterPrint';
import RosterCard from './RosterCard';
import { useStudentAttendance } from '../hooks/useAttendance';
import { useAttendanceRoster } from '../hooks/useAttendanceRoster';
import { useRosterPrint } from '../hooks/useRosterPrint';
import { useStudentRosterColumns } from '../hooks/useAttendanceTableColumns';
import { useStudentsOnDate } from '@/features/Students/hooks/useStudents';
import { useSections } from '@/features/Sections/hooks/useSections';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useTranslation } from 'najm-i18n/react';
import * as sectionApi from '@/services/sectionApi';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';
import { useViewingYearDate, useViewingYearKey } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { useSchoolFormat, useSchoolToday } from '@/hooks/useSchoolFormat';
import styles from './StudentAttendanceTable.module.css';

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
  const { can } = useViewerRole();
  const canEdit = can('create:attendance');
  const { sections, isSectionsLoading } = useSections();
  const { classes, isClassesLoading } = useClasses();
  const { attendance, submitRoster, isSubmittingRoster, isAttendanceLoading, error: attendanceError } = useStudentAttendance();
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
  const canMark = canEdit && !isSubmittingRoster && (isDailyMode || isAllClasses || !!selectedAssignment);
  const columns = useStudentRosterColumns({ getStatus: roster.getStatus, setStatus: roster.setStatus, readOnly: !canMark });

  // Below `NTable`'s card breakpoint the nine-column register is unusable — it
  // compresses rather than scrolls — so the same roster row is handed a card
  // that keeps the student legible and the marks tappable. Memoised because
  // `NTable` treats the renderer as a component type: a new identity each
  // render would remount every card and drop the press it was handling.
  const renderRosterCard = useCallback(
    (props: any) => (
      <RosterCard
        {...props}
        classNames={{ ...props.classNames, name: 'text-xs', root: 'p-2 md:px-4 md:py-3' }}
        readOnly={!canMark}
        getStatus={roster.getStatus}
        setStatus={roster.setStatus}
        detail={[
          props.data?.studentCode,
          [props.data?.class?.name, props.data?.section?.name].filter(Boolean).join(' - '),
        ].filter(Boolean).join(' | ')}
      />
    ),
    [roster.getStatus, roster.setStatus, canMark],
  );
  const visibleStudents = useMemo(
    () => filterRoster(filteredStudents, { search, status }, roster.getStatus),
    [filteredStudents, search, status, roster.getStatus],
  );
  // The print menu picks the marks, so it prints the whole class or section
  // whatever the search and status filters show. One section names its class
  // in the sheet's header, so only the whole school needs a class column.
  const print = useRosterPrint();
  const { displayDateOnly } = useSchoolFormat();
  const genderLabel = (gender?: string | null) => gender === 'M' ? t('common.male') : gender === 'F' ? t('common.female') : gender ?? '';
  const printRoster = (choice: RosterPrintChoice) => print(choice, orderByCycle(filteredStudents).map((student: any) => ({
    cells: [
      student.studentCode ?? '',
      student.name ?? '',
      genderLabel(student.gender),
      student.dateOfBirth ? displayDateOnly(student.dateOfBirth) : '—',
      student.phone?.trim() || student.contactPhone || '',
      ...(isAllClasses ? [student.class?.name ?? '', student.section?.name ?? ''] : []),
    ],
    mark: roster.getStatus(student.id),
  })), {
    title: t('attendance.roster.studentTitle'),
    date: roster.selectedDate,
    orientation: isAllClasses ? 'landscape' : 'portrait',
    details: [
      { label: t('attendance.roster.class'), value: classOptions.find((option) => option.value === selectedClassId)?.label ?? '' },
      ...(isAllClasses ? [] : [{ label: t('attendance.roster.section'), value: sectionOptions.find((option) => option.value === selectedSectionId)?.label ?? '' }]),
      ...(selectedAssignment ? [{ label: t('attendance.roster.teacherSubject'), value: `${selectedAssignment.name} - ${selectedAssignment.subjectName}` }] : []),
    ],
    columns: [t('attendance.roster.code'), t('students.table.name'), t('students.table.gender'), t('students.form.dateOfBirth'), t('students.table.phone'), ...(isAllClasses ? [t('attendance.roster.class'), t('attendance.roster.section')] : [])],
  });

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
          ? t('attendance.roster.allSections')
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
        placeholder: t('common.allStatuses'),
        type: 'select',
        options: [
          { value: '', label: t('common.allStatuses') },
          { value: 'present', label: t('attendance.roster.present') },
          { value: 'absent', label: t('attendance.roster.absent') },
          { value: 'late', label: t('attendance.roster.late') },
          { value: 'unmarked', label: t('attendance.roster.unmarked') },
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
  const canSubmit = canEdit && (roster.hasChanges || isAllClasses || (!!selectedSectionId && (isDailyMode || !!selectedAssignmentId)));
  const submitTitle = roster.hasChanges || isAllClasses
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
  const isRosterLoading = isStudentsLoading || isSectionsLoading || isClassesLoading || isAttendanceLoading;
  const canImportRoster = canMark && !isRosterLoading && !attendanceError && !studentsError && filteredStudents.length > 0;
  const importLabels = {
    importDescription: t('attendance.roster.importDescription', { date: displayDateOnly(roster.selectedDate) }),
    importConfirm: t('attendance.roster.importConfirm'),
  };
  const handleImport = (rows: Record<string, unknown>[]) => {
    if (!canImportRoster) throw new Error(t('attendance.roster.importUnavailable'));
    const result = parseStudentRosterImport(rows, filteredStudents, {
      codeHeader: t('students.table.studentCode'),
      statusHeader: t('common.status'),
      statuses: { present: t('attendance.roster.present'), absent: t('attendance.roster.absent'), late: t('attendance.roster.late') },
    });
    if (result.ok === false) throw new Error(t(`attendance.roster.importErrors.${result.issue.reason}`, { row: result.issue.row, code: result.issue.code }));
    roster.setStatuses(result.marks);
    toast.success(t('attendance.roster.importSuccess', { count: result.count }));
  };

  return (
    <div className={`${styles.screen} flex h-full min-h-0 flex-col gap-2`}>
      {/* The header is drawn at once: only its count waits for the roster. A
          placeholder header left the page without any text until every list
          had loaded (3.5 s on a JHL phone), and mounting the real one then
          refetched its menus' settings and unread count. */}
      <NPageHeader
        mobileBack
        icon={FEATURE_ICONS.studentAttendance}
        title={t('navigation.studentAttendance')}
        subtitle={isCountUnknown(studentsError, filteredStudents, isStudentsLoading || isSectionsLoading || isClassesLoading) ? undefined : t('attendance.subtitle.studentCount', { count: filteredStudents.length })}
        compactActions={(
          <HeaderActionsMenu contentClassName="md:hidden" hasOwnActions={false}><PageHeaderGlobalActions /></HeaderActionsMenu>
        )}
      >
        <NPageHeaderActions>
          <RosterStats stats={roster.stats} loading={isRosterLoading} className="lg:hidden" />
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable<any>
        headerSlot={(
          <RosterFilters
            loading={isRosterLoading}
            filters={filters}
          >
            <RosterHeader
              loading={isRosterLoading}
              showMobileSubmit={false}
              showStats={false}
              print={(
                <RosterPrintMenu
                  counts={roster.stats}
                  onPrint={printRoster}
                  disabled={filteredStudents.length === 0 || isStudentsLoading || isAttendanceLoading || !!attendanceError || !!studentsError}
                />
              )}
              hasChanges={roster.hasChanges}
              isSubmitting={isSubmitting}
              stats={roster.stats}
              onSubmit={roster.handleSubmit}
              canSubmit={canSubmit && !isRosterLoading && !attendanceError && !studentsError}
              submitTitle={submitTitle}
            />
          </RosterFilters>
        )}
        showExportButton
        exportTitle={`${t('attendance.roster.studentTitle')} - ${roster.selectedDate}`}
        showPrintButton={false}
        showImportButton={canImportRoster}
        importColumns={STUDENT_ROSTER_IMPORT_COLUMNS}
        onDataChange={handleImport}
        toolbarLabels={importLabels}
        responsiveSkeleton
        data={visibleStudents}
        getRowId={(student) => student.id}
        isFilteredEmpty={filteredStudents.length > 0 && visibleStudents.length === 0}
        columns={columns}
        loading={isRosterLoading}
        classNames={{ header: styles.toolbar, tableHeader: isRosterLoading ? ROSTER_LOADING_TABLE_HEADER : undefined }}
        error={attendanceError || (hasFailedToLoad(studentsError, filteredStudents) ? studentsError : null)}
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
        renderCardSkeleton={RosterCardSkeleton}
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
            icon={FEATURE_ICONS.studentAttendance}
            title={t('emptyStates.filtered.title')}
            description={t('emptyStates.filtered.description')}
          />
        )}
      />
      {canEdit && <RosterMobileSubmit
        count={roster.submissionCount}
        onSubmit={roster.handleSubmit}
        canSubmit={canSubmit && !isRosterLoading && !attendanceError && !studentsError}
        isSubmitting={isSubmitting}
        loading={isRosterLoading}
      />}
    </div>
  );
}

export default function StudentAttendanceTable() {
  return <StudentAttendanceTableForYear key={useViewingYearKey()} />;
}
