'use client';

import { NBadge, NAvatar, NButton, NEmptyState, NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, BellRing, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useFinanceOverdue } from '@/features/Dashboard/hooks/useDashboardHooks';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useTranslation } from 'najm-i18n/react';
import { cn } from 'najm-kit';
import { toast } from 'sonner';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import ReminderCard, { urgencyBadge, urgencyRowColor, type OverdueRow } from './components/ReminderCard';

const matchesStudent = (row: OverdueRow, query: string) =>
  row.studentName.toLowerCase().includes(query)
  || (row.studentCode ?? '').toLowerCase().includes(query);

const RemindersPage: React.FC = () => {
  const { t } = useTranslation();
  const { displayDateOnly, majorMoney } = useSchoolFormat();
  const { viewingYear } = useViewingAcademicYear();
  const { data, error, isLoading } = useFinanceOverdue(100);
  const yearKey = viewingYear ?? 'all';
  const [search, setSearch] = useState('');
  const [placementFilter, setPlacementFilter] = useState({ yearKey, classId: '', sectionId: '' });
  const classId = placementFilter.yearKey === yearKey ? placementFilter.classId : '';
  const sectionId = placementFilter.yearKey === yearKey ? placementFilter.sectionId : '';
  const [reminded, setReminded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPlacementFilter({ yearKey, classId: '', sectionId: '' });
  }, [yearKey]);

  const rows: OverdueRow[] = useMemo(() => Array.isArray(data) ? data : [], [data]);

  const classOptions = useMemo(() => Array.from(new Map(rows
    .filter((row) => row.classId)
    .map((row) => [row.classId!, { value: row.classId!, label: row.className }])).values())
    .sort((a, b) => a.label.localeCompare(b.label)), [rows]);

  const sectionOptions = useMemo(() => Array.from(new Map(rows
    .filter((row) => row.sectionId && (!classId || row.classId === classId))
    .map((row) => [row.sectionId!, {
      value: row.sectionId!,
      label: classId ? row.sectionName! : `${row.className} / ${row.sectionName}`,
    }])).values()).sort((a, b) => a.label.localeCompare(b.label)), [rows, classId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => matchesStudent(r, q)
      && (!classId || r.classId === classId)
      && (!sectionId || r.sectionId === sectionId));
  }, [rows, search, classId, sectionId]);

  const handleRemind = useCallback((studentId: string, name: string) => {
    setReminded((prev) => new Set(prev).add(`${yearKey}:${studentId}`));
    toast.success(t('reports.reminders.toastReminded', { name }), {
      description: t('reports.reminders.toastSmsComingSoon'),
    });
  }, [t, yearKey]);

  const handleRemindAll = useCallback(() => {
    setReminded((prev) => new Set([...prev, ...filtered.map((r) => `${yearKey}:${r.studentId}`)]));
    toast.success(t('reports.reminders.toastRemindedAll', { count: filtered.length }), {
      description: t('reports.reminders.toastSmsComingSoon'),
    });
  }, [filtered, t, yearKey]);

  const totalOverdue = filtered.reduce((s, r) => s + r.totalOverdue, 0);

  const filters = useMemo(() => [
    {
      name: 'studentName',
      type: 'text',
      placeholder: t('reports.reminders.searchPlaceholder'),
      value: search,
      onChange: setSearch,
      className: 'w-full lg:w-72',
    },
    {
      name: 'classId',
      type: 'combobox',
      showIcon: false,
      placeholder: t('students.filters.filterByClass'),
      options: classOptions,
      value: classId,
      onChange: (value: string) => setPlacementFilter({
        yearKey, classId: value === '__clear__' ? '' : value, sectionId: '',
      }),
      className: 'w-full lg:w-48',
    },
    {
      name: 'sectionId',
      type: 'combobox',
      showIcon: false,
      placeholder: t('students.filters.filterBySection'),
      options: sectionOptions,
      value: sectionId,
      onChange: (value: string) => setPlacementFilter({
        yearKey, classId, sectionId: value === '__clear__' ? '' : value,
      }),
      className: 'w-full lg:w-48',
    },
  ], [search, t, classOptions, sectionOptions, classId, sectionId, yearKey]);

  const columns = useMemo(() => [
    {
      accessorKey: 'studentCode',
      header: t('students.table.studentCode'),
      enableSorting: true,
      cell: ({ getValue }: any) => (
        <span className="whitespace-nowrap font-medium text-sm">
          {getValue() || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'studentName',
      header: t('reports.aging.student') || 'Student',
      enableSorting: true,
      filterFn: (row: any, _id: string, value: unknown) =>
        matchesStudent(row.original, String(value ?? '').toLowerCase()),
      cell: ({ row }: any) => {
        const done = reminded.has(`${yearKey}:${row.original.studentId}`);
        return (
          <NAvatar
            src={row.original.studentImage}
            title={row.original.studentName}
            size="sm"
            classNames={{ title: cn(done && 'text-muted-foreground line-through') }}
          />
        );
      },
    },
    {
      accessorKey: 'daysOverdue',
      header: t('reports.reminders.overdueAmount') || 'Overdue',
      enableSorting: true,
      cell: ({ row }: any) => {
        const done = reminded.has(`${yearKey}:${row.original.studentId}`);
        return (
          <NBadge
            className={cn(
              'inline-flex whitespace-nowrap rounded-full font-semibold',
              done ? 'bg-muted text-muted-foreground' : urgencyBadge(row.original.daysOverdue),
            )}
          >
            {t('reports.reminders.daysOverdue', {
              count: row.original.daysOverdue,
              plural: row.original.daysOverdue > 1 ? 's' : '',
            })}
          </NBadge>
        );
      },
    },
    {
      accessorKey: 'oldestDueDate',
      header: t('reports.reminders.oldestDueDate') || 'Oldest due date',
      enableSorting: true,
      cell: ({ row }: any) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {displayDateOnly(row.original.oldestDueDate)}
        </span>
      ),
    },
    {
      accessorKey: 'totalOverdue',
      header: t('common.amount') || 'Amount',
      enableSorting: true,
      cell: ({ row }: any) => {
        const done = reminded.has(`${yearKey}:${row.original.studentId}`);
        return (
          <span className={cn('whitespace-nowrap font-bold tabular-nums', done ? 'text-muted-foreground' : 'text-red-600')}>
            {majorMoney(row.original.totalOverdue)}
          </span>
        );
      },
    },
    {
      id: 'reminder',
      header: t('reports.reminders.remind') || 'Reminder',
      enableSorting: false,
      cell: ({ row }: any) => {
        const done = reminded.has(`${yearKey}:${row.original.studentId}`);
        return done ? (
          <div className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            {t('reports.reminders.reminded')}
          </div>
        ) : (
          <NButton
            size="sm"
            variant="outline"
            onClick={() => handleRemind(row.original.studentId, row.original.studentName)}
            className="h-8 gap-1.5"
          >
            <Bell className="h-3.5 w-3.5" />
            {t('reports.reminders.remind')}
          </NButton>
        );
      },
    },
  ], [handleRemind, displayDateOnly, majorMoney, reminded, t, yearKey]);

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      <NPageHeader
        icon={BellRing}
        title={t('reports.reminders.title')}
        subtitle={`${viewingYear ? `${t('reports.year', { year: viewingYear })} · ` : ''}${t('reports.reminders.studentsOverdueCount', { count: filtered.length })} · ${majorMoney(totalOverdue)}`}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      {error && !isLoading ? (
        <NEmptyState icon={AlertTriangle} title={t('common.feedback.errorMessage')} className="min-h-64" />
      ) : <NTable
        data={filtered}
        columns={columns}
        filters={filters}
        loading={isLoading}
        getRowId={(row) => row.studentId}
        getRowClassName={(row) => cn(
          'border-l-4',
          reminded.has(`${yearKey}:${row.studentId}`) ? 'border-l-muted opacity-60' : urgencyRowColor(row.daysOverdue),
        )}
        defaultSorting={[{ id: 'daysOverdue', desc: true }]}
        defaultMode="table"
        availableModes={['table', 'cards']}
        renderCard={({ data: row }: { data: OverdueRow }) => (
          <ReminderCard
            data={row}
            reminded={reminded.has(`${yearKey}:${row.studentId}`)}
            onRemind={handleRemind}
          />
        )}
        showViewToggle={false}
        showColumnVisibility={false}
        showCheckbox
        loadingText={t('common.loading') || 'Loading reminders...'}
        noDataText={t('reports.reminders.noData')}
        noResultsText={search ? t('reports.reminders.noResults', { search }) : t('emptyStates.filtered.title')}
        isEmpty={!isLoading && rows.length === 0}
        isFilteredEmpty={!isLoading && rows.length > 0 && filtered.length === 0}
        renderEmpty={() => (
          <NEmptyState icon={BellRing} title={t('reports.reminders.noData')} className="min-h-64" />
        )}
        renderFilteredEmpty={() => (
          <NEmptyState
            icon={Search}
            title={search ? t('reports.reminders.noResults', { search }) : t('emptyStates.filtered.title')}
            className="min-h-64"
          />
        )}
        headerSlot={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <NBadge className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 font-semibold text-red-700">
              <Bell className="h-3.5 w-3.5" />
              {filtered.length} {t('reports.reminders.studentsOverdue')}
            </NBadge>
            <NBadge className="inline-flex items-center rounded-lg bg-red-50 font-semibold text-red-700">
              {majorMoney(totalOverdue)} {t('reports.reminders.overdueAmount')}
            </NBadge>
            <NButton
              size="sm"
              variant="outline"
              onClick={handleRemindAll}
              disabled={filtered.length === 0}
              className="h-10 gap-2"
            >
              <BellRing className="h-4 w-4" />
              {t('reports.reminders.remindAll', { count: filtered.length })}
            </NButton>
          </div>
        )}
      />}
    </div>
  );
};

export default RemindersPage;
