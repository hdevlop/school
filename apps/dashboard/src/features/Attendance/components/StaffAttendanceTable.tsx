'use client';

import { FEATURE_ICONS } from '@/shared/featureIcons';
import { NPageHeader, NPageHeaderActions, NErrorState, NForbiddenState, NEmptyState } from 'najm-kit';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { CalendarCheck, SearchX } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import RosterHeader from './RosterHeader';
import RosterFilters from './RosterFilters';
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

function StaffAttendanceTable() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
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

  const { getDetails, getStatus, setDetails } = roster;
  const renderDetails = useCallback((person: any) => (
    <StaffAttendanceDetails name={person.name} details={getDetails(person.id)}
      disabled={getStatus(person.id) === 'unmarked'}
      onChange={(details) => setDetails(person.id, details)} />
  ), [getDetails, getStatus, setDetails]);
  const columns = useStaffRosterColumns({ getStatus: roster.getStatus, setStatus: roster.setStatus, renderDetails });

  // The staff register is the same nine-column table as the student one and was
  // squeezed the same way below the card breakpoint.
  const renderRosterCard = useCallback(
    (props: any) => (
      <RosterCard
        {...props}
        getStatus={roster.getStatus}
        setStatus={roster.setStatus}
        detail={t(`staff.roles.${props.data?.role}`)}
        avatarSrc={props.data?.image || getStaffAvatar(props.data?.role, props.data?.gender)}
      >{renderDetails(props.data)}</RosterCard>
    ),
    [t, roster.getStatus, roster.setStatus, renderDetails],
  );
  const rawFilters = useStaffRosterFilters(
    { value: roster.selectedDate, onChange: roster.goToDate },
    activeStaffRoles,
  );
  const filters = rawFilters.map((filter) => {
    const binding = filter.name === 'name'
      ? { label: t('attendance.roster.search'), value: search, onChange: setSearch }
      : filter.name === 'role'
        ? { label: t('staff.table.role'), value: role, onChange: setRole }
        : filter.name === 'status'
          ? { label: t('attendance.roster.status'), value: status, onChange: setStatus }
          : { label: t('attendance.roster.date'), value: roster.selectedDate, onChange: roster.goToDate };
    return {
      ...filter,
      ...binding,
      ...(filter.name === 'role' || filter.name === 'status'
        ? { options: [{ value: '', label: t('common.all') }, ...(filter.options ?? [])] }
        : {}),
    };
  });
  const visibleStaff = useMemo(
    () => filterRoster(staff || [], { search, status, role }, roster.getStatus),
    [staff, search, status, role, roster.getStatus],
  );
  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setRole('');
  };
  const total = staffRows.length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <NPageHeader
        icon={CalendarCheck}
        title={t('navigation.staffAttendance')}
        subtitle={isCountUnknown(staffError, staffRows, isStaffLoading || isAttendanceLoading || isStaffRolesLoading) ? undefined : t('attendance.subtitle.staffCount', { count: total })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <RosterFilters filters={filters} onReset={resetFilters} canReset={!!search || !!status || !!role}>
        <RosterHeader
          hasChanges={roster.hasChanges}
          isSubmitting={isSubmittingRoster}
          stats={roster.stats}
          onSubmit={roster.handleSubmit}
          onMarkAllPresent={() => roster.markAllAs('present')}
          canSubmit={total > 0 && !isStaffLoading && !isAttendanceLoading && !isStaffRolesLoading && !attendanceError}
        />
      </RosterFilters>

      <NTable
        responsiveSkeleton
        data={visibleStaff}
        isFilteredEmpty={total > 0 && visibleStaff.length === 0}
        columns={columns}
        loading={isStaffLoading || isAttendanceLoading || isStaffRolesLoading}
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
            icon={SearchX}
            title={t('emptyStates.filtered.title')}
            description={t('emptyStates.filtered.description')}
          />
        )}
        showAddButton={false}
        showCheckbox
        showViewToggle={false}
        defaultMode="table"
        renderCard={renderRosterCard}
      />
    </div>
  );
}

export default StaffAttendanceTable;
