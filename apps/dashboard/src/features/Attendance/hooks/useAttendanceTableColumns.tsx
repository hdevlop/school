import { useMemo } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { NBadge, NAvatar, NButton } from 'najm-kit';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useLanguage';
import { useStudentsTableColumns } from '@/features/Students/hooks/useStudentsTableColumns';
import type { RosterStatus } from './useAttendanceRoster';
import { getStaffAvatar } from '@/features/Staff/utils/staffAvatar';

const ROSTER_KEEP_COLUMNS = new Set(['select', 'studentCode', 'name', 'email', 'phone', 'class', 'section', 'gender']);


const IDLE = 'border-2 border-slate-300 bg-white text-slate-500 shadow-none hover:border-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800';

const STATUS_META: Record<RosterStatus, { label: string; icon: any; idle: string; active: string }> = {
  present: {
    label: 'Present',
    icon: Check,
    idle: IDLE + ' hover:text-emerald-600 dark:hover:text-emerald-400',
    active: 'border-2 border-emerald-700 bg-emerald-600 text-white shadow-none outline outline-2 outline-offset-1 outline-emerald-200 hover:bg-emerald-700 dark:border-emerald-400 dark:bg-emerald-500 dark:text-white dark:outline-emerald-900',
  },
  absent: {
    label: 'Absent',
    icon: X,
    idle: IDLE + ' hover:text-red-600 dark:hover:text-red-400',
    active: 'border-2 border-red-700 bg-red-600 text-white shadow-none outline outline-2 outline-offset-1 outline-red-200 hover:bg-red-700 dark:border-red-400 dark:bg-red-500 dark:text-white dark:outline-red-900',
  },
  late: {
    label: 'Late',
    icon: Clock,
    idle: IDLE + ' hover:text-amber-600 dark:hover:text-amber-400',
    active: 'border-2 border-amber-600 bg-amber-500 text-white shadow-none outline outline-2 outline-offset-1 outline-amber-200 hover:bg-amber-600 dark:border-amber-400 dark:bg-amber-500 dark:text-white dark:outline-amber-900',
  },
};

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
  cell: ({ row }: any) => {
    const current = getStatus(row.original.id);
    return (
      <div className="flex w-full justify-center gap-2">
        {(['present', 'absent', 'late'] as RosterStatus[]).map((s) => {
          const meta = STATUS_META[s];
          const Icon = meta.icon;
          const active = current === s;
          return (
            <NButton
              key={s}
              type="button"
              variant="outline"
              size="sm"
              title={meta.label}
              aria-pressed={active}
              onClick={() => setStatus(row.original.id, s)}
              className={cn(
                'flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg p-0 transition-all duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                active ? meta.active : meta.idle
              )}
            >
              <Icon className="h-4 w-4" />
            </NButton>
          );
        })}
      </div>
    );
  },
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
