import { useMemo } from 'react';
import { NBadge, NAvatar } from 'najm-kit';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';
import { useTranslation } from 'najm-i18n/react';
import { useStudentsTableColumns } from '@/features/Students/hooks/useStudentsTableColumns';
import RosterMarks from '../components/RosterMarks';
import type { RosterStatus } from './useAttendanceRoster';
import { getStaffAvatar } from '@/features/Staff/utils/staffAvatar';

const ROSTER_KEEP_COLUMNS = new Set(['select', 'studentCode', 'name', 'email', 'phone', 'class', 'section', 'gender']);


interface RosterColumnsOptions {
  getStatus: (id: string) => RosterStatus;
  setStatus: (id: string, status: RosterStatus) => void;
}

const statusCell = ({ getStatus, setStatus }: RosterColumnsOptions) => ({
  id: 'status',
  accessorFn: (row: any) => getStatus(row.id),
  header: () => <div className="flex w-full justify-center text-center">Status</div>,
  enableSorting: false,
  enableColumnFilter: true,
  cell: ({ row }: any) => (
    <RosterMarks
      current={getStatus(row.original.id)}
      onSelect={(status) => setStatus(row.original.id, status)}
    />
  ),
});

export const useStudentRosterColumns = ({ getStatus, setStatus }: RosterColumnsOptions) => {
  const studentColumns = useStudentsTableColumns();

  return useMemo(() => {
    const base = studentColumns.filter((col: any) =>
      ROSTER_KEEP_COLUMNS.has(col.id ?? col.accessorKey)
    );
    return [...base, statusCell({ getStatus, setStatus })];
  }, [studentColumns, getStatus, setStatus]);
};

export const useTeacherRosterColumns = ({ getStatus, setStatus }: RosterColumnsOptions) => {
  return useStaffRosterColumns({ getStatus, setStatus });
};

export const useStaffRosterColumns = ({ getStatus, setStatus }: RosterColumnsOptions) => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: 'name',
      header: t('attendance.roster.staff'),
      enableSorting: true,
      cell: ({ row }: any) => {
        const staff = row.original;
        return (
          <NAvatar
            src={staff.image || getStaffAvatar(staff.role, staff.gender)}
            title={staff.name}
            size="sm"
            version={staff.updatedAt}
          />
        );
      },
    },
    {
      accessorKey: 'gender',
      header: t('students.table.gender'),
      enableSorting: true,
      cell: ({ getValue }: any) => {
        const gender = getValue();
        if (!gender) return <span className="text-gray-400">{t('common.notSpecified')}</span>;
        return gender === 'M' ? t('common.male') : gender === 'F' ? t('common.female') : gender;
      },
    },
    {
      accessorKey: 'email',
      header: t('teachers.table.email'),
      enableSorting: false,
      cell: ({ getValue }: any) => getValue() || <span className="text-gray-400">{t('common.notAvailable')}</span>,
    },
    {
      accessorKey: 'phone',
      header: t('teachers.table.phone'),
      enableSorting: false,
      cell: ({ getValue }: any) => getValue() || <span className="text-gray-400">{t('common.notAvailable')}</span>,
    },
    {
      accessorKey: 'role',
      header: t('staff.table.role'),
      enableSorting: true,
      cell: ({ getValue }: any) => getValue() || <span className="text-gray-400">{t('common.notSpecified')}</span>,
    },
    statusCell({ getStatus, setStatus }),
  ], [t, getStatus, setStatus]);
};

export const useStudentAttendanceTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: "date",
      header: t('attendance.table.date'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-medium text-sm">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "student.name",
      header: t('attendance.table.studentName'),
      enableSorting: true,
      cell: ({ row }) => {
        const student = row.original.student;
        return (
          <div className="font-medium text-sm">
            {student?.name || <span className="text-gray-400">-</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "student.studentCode",
      header: t('attendance.table.studentCode'),
      enableSorting: true,
      cell: ({ row }) => {
        const student = row.original.student;
        return (
          <div className="font-mono text-xs text-muted-foreground">
            {student?.studentCode || '-'}
          </div>
        );
      },
    },
    {
      accessorKey: "class.name",
      header: t('attendance.table.class'),
      enableSorting: true,
      cell: ({ row }) => {
        const cls = row.original.class;
        return (
          <div className="text-sm">
            {cls?.name || <span className="text-gray-400">-</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "section.name",
      header: t('attendance.table.section'),
      enableSorting: true,
      cell: ({ row }) => {
        const section = row.original.section;
        return (
          <div className="text-sm">
            {section?.name || <span className="text-gray-400">-</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "subject.name",
      header: t('attendance.table.subject'),
      enableSorting: true,
      cell: ({ row }) => {
        const subject = row.original.subject;
        return (
          <div className="text-sm">
            {subject?.name || <span className="text-gray-400">-</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: t('attendance.table.status'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const status = getValue();
        return <NBadge status={status} statusMap={STATUS_COLOR_MAP} />;
      },
    },
    {
      accessorKey: "notes",
      header: t('attendance.table.notes'),
      enableSorting: false,
      cell: ({ getValue }) => {
        const notes = getValue();
        if (!notes) return <span className="text-gray-400">-</span>;
        return (
          <div className="text-sm text-muted-foreground max-w-xs truncate">
            {notes}
          </div>
        );
      },
    },
  ], [t]);
};

export const useTeacherAttendanceTableColumns = () => {
  return useStaffAttendanceTableColumns();
};

export const useStaffAttendanceTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: "date",
      header: t('attendance.table.date'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-medium text-sm">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "staff.name",
      header: t('attendance.table.staffName'),
      enableSorting: true,
      cell: ({ row }) => {
        const staff = row.original.staff;
        return (
          <div className="font-medium text-sm">
            {staff?.name || <span className="text-gray-400">-</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: t('attendance.table.status'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const status = getValue();
        return <NBadge status={status} statusMap={STATUS_COLOR_MAP} />;
      },
    },
    {
      accessorKey: "notes",
      header: t('attendance.table.notes'),
      enableSorting: false,
      cell: ({ getValue }) => {
        const notes = getValue();
        if (!notes) return <span className="text-gray-400">-</span>;
        return (
          <div className="text-sm text-muted-foreground max-w-xs truncate">
            {notes}
          </div>
        );
      },
    },
  ], [t]);
};
