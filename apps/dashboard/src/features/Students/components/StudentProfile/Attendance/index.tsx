'use client';

import { NEmptyState, NStatCard, NTable } from 'najm-kit';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, CalendarDays, CheckCircle2, Clock3, UserX } from 'lucide-react';
import { getAttendanceByStudentApi } from '@/services/attendanceApi';
import { useTranslation } from '@/hooks/useLanguage';

const formatDate = (value: string | null | undefined, language: string) =>
  value ? new Date(value).toLocaleDateString(language, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const statusClassNames: Record<string, string> = {
  present: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  absent: 'border-rose-200 bg-rose-50 text-rose-700',
  late: 'border-amber-200 bg-amber-50 text-amber-700',
};

const StatusBadge = ({ status }: { status?: string | null }) => {
  const { t } = useTranslation();
  const label = status && status in statusClassNames
    ? t(`students.profile.attendanceDetails.${status}`)
    : status || t('students.profile.unknown');
  const className = statusClassNames[status || ''] ?? 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${className}`}>
      {label}
    </span>
  );
};

const getClassLabel = (row: any, student: any) => {
  const className = row.class?.name || row.student?.class?.name || student?.class?.name;
  const sectionName = row.section?.name || row.student?.section?.name || student?.section?.name;

  if (className && sectionName) return `${className} - ${sectionName}`;
  return className || sectionName || '—';
};

export default function AttendanceTab({ studentId, student }: { studentId?: string; student?: any }) {
  const { t, language } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'student', studentId],
    queryFn: () => getAttendanceByStudentApi(studentId as string),
    enabled: !!studentId,
  });

  const rows = useMemo(() => {
    const rowsRaw = data?.data ?? data ?? [];
    return Array.isArray(rowsRaw) ? rowsRaw : [];
  }, [data]);

  const visibleRows = useMemo(
    () => rows.filter((row) => row.status === 'late' || row.status === 'absent'),
    [rows],
  );

  const summary = useMemo(() => {
    const totals = rows.reduce(
      (acc, row) => {
        const status = row.status as 'present' | 'absent' | 'late';
        if (status in acc) acc[status] += 1;
        return acc;
      },
      { present: 0, absent: 0, late: 0 },
    );

    return {
      ...totals,
      rate: rows.length ? Math.round((totals.present / rows.length) * 100) : 0,
    };
  }, [rows]);

  const columns = useMemo(() => [
    {
      accessorKey: 'date',
      header: t('students.profile.attendanceDetails.date'),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="font-medium text-slate-700">{formatDate(row.original.date, language)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: t('students.profile.attendanceDetails.status'),
      enableSorting: true,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'class',
      header: t('students.profile.attendanceDetails.class'),
      enableSorting: false,
      cell: ({ row }) => getClassLabel(row.original, student),
    },
    {
      accessorKey: 'subject',
      header: t('students.profile.attendanceDetails.subject'),
      enableSorting: false,
      cell: ({ row }) => row.original.subject?.name || t('students.profile.attendanceDetails.daily'),
    },
    {
      accessorKey: 'notes',
      header: t('students.profile.attendanceDetails.notes'),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-slate-600">{row.original.notes || '—'}</span>
      ),
    },
  ], [language, student, t]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <NStatCard
          icon={CalendarCheck}
          label={t('students.profile.tabs.attendance')}
          value={`${summary.rate}%`}
          classNames={{ icon: 'bg-sky-50 text-sky-600 group-hover:bg-sky-100' }}
        />
        <NStatCard
          icon={CheckCircle2}
          label={t('students.profile.attendanceDetails.present')}
          value={summary.present}
          classNames={{ icon: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' }}
        />
        <NStatCard
          icon={UserX}
          label={t('students.profile.attendanceDetails.absent')}
          value={summary.absent}
          classNames={{ icon: 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' }}
        />
        <NStatCard
          icon={Clock3}
          label={t('students.profile.attendanceDetails.late')}
          value={summary.late}
          classNames={{ icon: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' }}
        />
      </div>

      <NTable
        data={visibleRows}
        columns={columns}
        loading={isLoading}
        defaultMode="table"
        availableModes={['table']}
        showViewToggle={false}
        showColumnVisibility={false}
        showCheckbox={false}
        loadingText={t('students.profile.attendanceDetails.loading')}
        noDataText={t('students.profile.attendanceDetails.noExceptions')}
        pagination={{ pageIndex: 0, pageSize: Math.max(visibleRows.length, 1) }}
        showPagination={false}
        dynamicHeight={false}
        renderEmpty={() => (
          <NEmptyState
            icon={CalendarDays}
            title={t('students.profile.attendanceDetails.noExceptions')}
            className="min-h-64"
          />
        )}
      />
    </div>
  );
}

