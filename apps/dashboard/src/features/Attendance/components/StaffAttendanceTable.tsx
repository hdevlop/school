'use client';

import { NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import { CalendarCheck } from 'lucide-react';
import { useState } from 'react';
import RosterHeader from './RosterHeader';
import { useStaffAttendance } from '../hooks/useAttendance';
import { useAttendanceRoster } from '../hooks/useAttendanceRoster';
import { useStaffRosterColumns } from '../hooks/useAttendanceTableColumns';
import { useStaffRosterFilters } from '../hooks/useAttendanceTableFilters';
import { useStaff } from '@/features/Staff/hooks/useStaff';
import { useStaffRoles } from '@/features/Staff/hooks/useStaffRoles';
import { useTranslation } from '@/hooks/useLanguage';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { toLocalISODate } from '@/lib/localDate';

function StaffAttendanceTable() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(toLocalISODate);
  const { staff, isStaffLoading } = useStaff({ attendanceRoster: true, attendanceDate: selectedDate });
  const { activeStaffRoles, isStaffRolesLoading } = useStaffRoles({ activeOnly: true });
  const { attendance, submitRoster, isSubmittingRoster, isAttendanceLoading } = useStaffAttendance({ date: selectedDate });
  const staffRows = staff || [];

  const roster = useAttendanceRoster({
    kind: 'staff',
    roster: staffRows,
    existingAttendance: attendance || [],
    onSubmitBatch: submitRoster,
    selectedDate,
    onDateChange: setSelectedDate,
  });

  const columns = useStaffRosterColumns({ getStatus: roster.getStatus, setStatus: roster.setStatus });
  const rawFilters = useStaffRosterFilters(
    { value: roster.selectedDate, onChange: roster.goToDate },
    activeStaffRoles,
  );
  const total = staffRows.length;

  return (
    <div className="flex flex-col gap-2 h-full">
      <NPageHeader
        icon={CalendarCheck}
        title={t('navigation.staffAttendance')}
        subtitle={`${total} ${total === 1 ? t('attendance.roster.staffMember') : t('attendance.roster.staffMembers')}`}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={staffRows}
        columns={columns}
        filters={rawFilters}
        headerSlot={
          <RosterHeader
            hasChanges={roster.hasChanges}
            isSubmitting={isSubmittingRoster}
            stats={roster.stats}
            onReset={roster.resetDraft}
            onSubmit={roster.handleSubmit}
            canSubmit={!isStaffLoading && !isAttendanceLoading && !isStaffRolesLoading}
          />
        }
        loading={isStaffLoading || isAttendanceLoading || isStaffRolesLoading}
        showAddButton={false}
        showCheckbox
        showViewToggle={false}
        defaultMode="table"
      />
    </div>
  );
}

export default StaffAttendanceTable;
