'use client';

import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';
import { NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState } from 'najm-kit';
import { SchoolTable as NTable } from '@/components/SchoolTable';

import { useCallback, useMemo, useState } from 'react';
import RosterHeader, { RosterStats } from './RosterHeader';
import { HeaderActionsMenu } from '@/components/HeaderActionsMenu';
import RosterMobileSubmit from './RosterMobileSubmit';
import RosterPrintMenu from './RosterPrintMenu';
import { useRosterPrint } from '../hooks/useRosterPrint';
import type { RosterPrintChoice } from '../config/rosterPrint';
import RosterFilters from './RosterFilters';
import { StaffRosterCardSkeleton, ROSTER_LOADING_TABLE_HEADER } from './RosterLoading';
import { filterRoster } from '../config/filterRoster';
import RosterCard from './RosterCard';
import { useStaffAttendance } from '../hooks/useAttendance';
import { useAttendanceRoster } from '../hooks/useAttendanceRoster';
import { useStaffRosterColumns } from '../hooks/useAttendanceTableColumns';
import { useStaffRosterFilters } from '../hooks/useAttendanceTableFilters';
import { useStaff } from '@/features/Staff/hooks/useStaff';
import { useStaffRoles } from '@/features/Staff/hooks/useStaffRoles';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { hasFailedToLoad, isCountUnknown, isAuthorizationError } from '@/services/apiError';
import { getStaffAvatar } from '@/features/Staff/utils/staffAvatar';
import { useViewingYearDate } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { useSchoolToday } from '@/hooks/useSchoolFormat';
import StaffAttendanceDetails from './StaffAttendanceDetails';
import styles from './StudentAttendanceTable.module.css';

function StaffAttendanceTable() {
  const { t } = useTranslation();
  const { can } = useViewerRole();
  const canEdit = can('update:staff-attendance');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedDate, setSelectedDate] = useViewingYearDate(useSchoolToday());
  const { staff, error: staffError, isStaffLoading } = useStaff({ attendanceRoster: true, attendanceDate: selectedDate });
  const { activeStaffRoles, isStaffRolesLoading } = useStaffRoles({ activeOnly: true });
  const { attendance, submitRoster, isSubmittingRoster, isAttendanceLoading, error: attendanceError } = useStaffAttendance({ date: selectedDate });
  const staffRows = staff || [];

  const roster = useAttendanceRoster({
    kind: 'staff',
    roster: staffRows,
    existingAttendance: attendance || [],
    onSubmitBatch: submitRoster,
    selectedDate,
    onDateChange: setSelectedDate,
  });

  const isRosterLoading = isStaffLoading || isAttendanceLoading || isStaffRolesLoading;
  const canMark = canEdit && !isSubmittingRoster && !isRosterLoading && !attendanceError && !staffError;
  const canSubmit = canMark && staffRows.length > 0;
  const { getDetails, getStatus, setDetails } = roster;
  const renderDetails = useCallback((person: any) => (
    <StaffAttendanceDetails name={person.name} details={getDetails(person.id)}
      disabled={!canMark || getStatus(person.id) === 'unmarked'}
      onChange={(details) => setDetails(person.id, details)} />
  ), [canMark, getDetails, getStatus, setDetails]);
  const columns = useStaffRosterColumns({ readOnly: !canMark, getStatus: roster.getStatus, setStatus: roster.setStatus, renderDetails });

  // The staff register is the same nine-column table as the student one and was
  // squeezed the same way below the card breakpoint.
  const renderRosterCard = useCallback(
    (props: any) => (
      <RosterCard
        {...props}
        classNames={{ ...props.classNames, name: 'text-xs', root: 'p-2 md:px-4 md:py-3' }}
        readOnly={!canMark}
        getStatus={roster.getStatus}
        setStatus={roster.setStatus}
        detail={activeStaffRoles.find((item) => item.code === props.data?.role)?.label || t(`staff.roles.${props.data?.role}`)}
        avatarSrc={props.data?.image || getStaffAvatar(props.data?.role, props.data?.gender)}
        actions={(
          <StaffAttendanceDetails iconOnly name={props.data?.name} details={getDetails(props.data.id)}
            disabled={!canMark || getStatus(props.data.id) === 'unmarked'}
            onChange={(details) => setDetails(props.data.id, details)} />
        )}
      />
    ),
    [t, canMark, roster.getStatus, roster.setStatus, activeStaffRoles, getDetails, getStatus, setDetails],
  );
  const rawFilters = useStaffRosterFilters(
    { value: roster.selectedDate, onChange: roster.goToDate },
    activeStaffRoles,
  );
  const filters = rawFilters.filter((filter) => filter.name !== 'role').map((filter) => {
    const binding = filter.name === 'name'
      ? { label: t('attendance.roster.search'), value: search, onChange: setSearch }
      : filter.name === 'status'
        ? { label: t('attendance.roster.status'), value: status, onChange: setStatus }
        : { label: t('attendance.roster.date'), value: roster.selectedDate, onChange: roster.goToDate };
    return {
      ...filter,
      ...binding,
      className: undefined,
      ...(filter.name === 'status'
        ? {
            placeholder: t('common.allStatuses'),
            options: [{ value: '', label: t('common.allStatuses') }, ...(filter.options ?? [])],
          }
        : {}),
    };
  });
  const visibleStaff = useMemo(
    () => filterRoster(staff || [], { search, status }, roster.getStatus),
    [staff, search, status, roster.getStatus],
  );
  const total = staffRows.length;
  // The print menu picks the marks, so it prints every staff member whatever
  // the search and status filters show.
  const print = useRosterPrint();
  const genderLabel = (gender?: string | null) => gender === 'M' ? t('common.male') : gender === 'F' ? t('common.female') : gender ?? '';
  const printRoster = (choice: RosterPrintChoice) => print(choice, staffRows.map((person: any) => ({
    cells: [person.name ?? '', genderLabel(person.gender), person.phone ?? '', person.role ? t(`staff.roles.${person.role}`) : ''],
    mark: roster.getStatus(person.id),
  })), {
    title: t('attendance.roster.staffTitle'),
    date: roster.selectedDate,
    details: [],
    columns: [t('staff.table.name'), t('students.table.gender'), t('teachers.table.phone'), t('staff.table.role')],
  });

  return (
    <div className={`${styles.screen} flex h-full min-h-0 flex-col gap-2`}>
      {/* The header is drawn at once: only its count waits for the roster. A
          placeholder header left the page without any text until every list
          had loaded, and mounting the real one then refetched its menus. */}
      <NPageHeader
        mobileBack
        icon={FEATURE_ICONS.staffAttendance}
        title={t('navigation.staffAttendance')}
        subtitle={isCountUnknown(staffError, staffRows, isStaffLoading || isAttendanceLoading || isStaffRolesLoading) ? undefined : t('attendance.subtitle.staffCount', { count: total })}
        compactActions={(
          <HeaderActionsMenu contentClassName="md:hidden" hasOwnActions={false}><PageHeaderGlobalActions /></HeaderActionsMenu>
        )}
      >
        <NPageHeaderActions>
          <RosterStats stats={roster.stats} loading={isRosterLoading} className="lg:hidden" />
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

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
              disabled={total === 0 || isStaffLoading || isAttendanceLoading || !!attendanceError || !!staffError}
            />
          )}
          hasChanges={roster.hasChanges}
          isSubmitting={isSubmittingRoster}
          stats={roster.stats}
          onSubmit={roster.handleSubmit}
          canSubmit={canSubmit}
        />
      </RosterFilters>

      <NTable
        showExportButton={false} showPrintButton={false}
        responsiveSkeleton
        data={visibleStaff}
        getRowId={(person) => person.id}
        isFilteredEmpty={total > 0 && visibleStaff.length === 0}
        columns={columns}
        loading={isRosterLoading}
        classNames={{ tableHeader: isRosterLoading ? ROSTER_LOADING_TABLE_HEADER : undefined }}
        error={attendanceError || (hasFailedToLoad(staffError, staffRows) ? staffError : null)}
        renderError={(currentError) => (
          isAuthorizationError(currentError)
            ? <NForbiddenState surface="panel" />
            : <NErrorState surface="panel" />
        )}
        renderEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.staffAttendance}
            title={t('emptyStates.staffAttendance.title')}
            description={t('emptyStates.staffAttendance.description')}
          />
        )}
        renderFilteredEmpty={() => (
          <NEmptyState
            surface="panel"
            icon={FEATURE_ICONS.staffAttendance}
            title={t('emptyStates.filtered.title')}
            description={t('emptyStates.filtered.description')}
          />
        )}
        showAddButton={false}
        showCheckbox
        showViewToggle={false}
        defaultMode="table"
        renderCard={renderRosterCard}
        renderCardSkeleton={StaffRosterCardSkeleton}
      />
      {canEdit && <RosterMobileSubmit
        count={roster.submissionCount}
        onSubmit={roster.handleSubmit}
        canSubmit={canSubmit}
        isSubmitting={isSubmittingRoster}
        loading={isRosterLoading}
      />}
    </div>
  );
}

export default StaffAttendanceTable;
