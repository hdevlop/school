'use client';

import { NAvatar, NButton, NEmptyState, NPageHeader, NPageHeaderActions, NTable } from 'najm-kit';
import React, { useCallback, useMemo, useState } from 'react';
import { Bell, BellRing, Search, CheckCircle2 } from 'lucide-react';
import { useFinanceOverdue } from '@/features/Dashboard/hooks/useDashboardHooks';
import { formatMAD, type SupportedLocale } from '@/lib/format';
import { useTranslation } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';

type OverdueRow = {
  studentId: string;
  studentName: string;
  studentImage: string | null;
  totalOverdue: number;
  daysOverdue: number;
  oldestDueDate: string | null;
};

const urgencyRowColor = (days: number) => {
  if (days > 60) return 'border-l-red-500 bg-red-50/40';
  if (days > 30) return 'border-l-orange-400 bg-orange-50/40';
  return 'border-l-yellow-400 bg-yellow-50/40';
};

const urgencyBadge = (days: number) => {
  if (days > 60) return 'bg-red-100 text-red-700';
  if (days > 30) return 'bg-orange-100 text-orange-700';
  return 'bg-yellow-100 text-yellow-700';
};

const RemindersPage: React.FC = () => {
  const { t, language } = useTranslation();
  const locale = (language as SupportedLocale) ?? 'en';
  const { data, isLoading } = useFinanceOverdue(100);
  const [search, setSearch] = useState('');
  const [reminded, setReminded] = useState<Set<string>>(new Set());

  const rows: OverdueRow[] = useMemo(() => Array.isArray(data) ? data : [], [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => r.studentName.toLowerCase().includes(q));
  }, [rows, search]);

  const handleRemind = useCallback((studentId: string, name: string) => {
    setReminded((prev) => new Set(prev).add(studentId));
    toast.success(t('reports.reminders.toastReminded', { name }), {
      description: t('reports.reminders.toastSmsComingSoon'),
    });
  }, [t]);

  const handleRemindAll = useCallback(() => {
    const ids = new Set(filtered.map((r) => r.studentId));
    setReminded(ids);
    toast.success(t('reports.reminders.toastRemindedAll', { count: filtered.length }), {
      description: t('reports.reminders.toastSmsComingSoon'),
    });
  }, [filtered, t]);

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
  ], [search, t]);

  const columns = useMemo(() => [
    {
      accessorKey: 'studentName',
      header: t('reports.aging.student') || 'Student',
      enableSorting: true,
      cell: ({ row }: any) => {
        const done = reminded.has(row.original.studentId);
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
        const done = reminded.has(row.original.studentId);
        return (
          <span
            className={cn(
              'inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold',
              done ? 'bg-muted text-muted-foreground' : urgencyBadge(row.original.daysOverdue),
            )}
          >
            {t('reports.reminders.daysOverdue', {
              count: row.original.daysOverdue,
              plural: row.original.daysOverdue > 1 ? 's' : '',
            })}
          </span>
        );
      },
    },
    {
      accessorKey: 'oldestDueDate',
      header: t('reports.reminders.oldestDueDate') || 'Oldest due date',
      enableSorting: true,
      cell: ({ row }: any) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {row.original.oldestDueDate
            ? new Date(row.original.oldestDueDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')
            : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'totalOverdue',
      header: t('common.amount') || 'Amount',
      enableSorting: true,
      cell: ({ row }: any) => {
        const done = reminded.has(row.original.studentId);
        return (
          <span className={cn('whitespace-nowrap font-bold tabular-nums', done ? 'text-muted-foreground' : 'text-red-600')}>
            {formatMAD(row.original.totalOverdue, locale)}
          </span>
        );
      },
    },
    {
      id: 'reminder',
      header: t('reports.reminders.remind') || 'Reminder',
      enableSorting: false,
      cell: ({ row }: any) => {
        const done = reminded.has(row.original.studentId);
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
  ], [handleRemind, language, locale, reminded, t]);

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      <NPageHeader
        icon={BellRing}
        title={t('reports.reminders.title')}
        subtitle={`${t('reports.reminders.studentsOverdueCount', { count: filtered.length })} · ${formatMAD(totalOverdue, locale)}`}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <NTable
        data={filtered}
        columns={columns}
        filters={filters}
        loading={isLoading}
        getRowId={(row) => row.studentId}
        getRowClassName={(row) => cn(
          'border-l-4',
          reminded.has(row.studentId) ? 'border-l-muted opacity-60' : urgencyRowColor(row.daysOverdue),
        )}
        defaultSorting={[{ id: 'daysOverdue', desc: true }]}
        defaultMode="table"
        availableModes={['table']}
        showViewToggle={false}
        showColumnVisibility={false}
        showCheckbox
        loadingText={t('common.loading') || 'Loading reminders...'}
        noDataText={t('reports.reminders.noData')}
        noResultsText={t('reports.reminders.noResults', { search })}
        isEmpty={!isLoading && rows.length === 0}
        isFilteredEmpty={!isLoading && rows.length > 0 && filtered.length === 0}
        renderEmpty={() => (
          <NEmptyState icon={BellRing} title={t('reports.reminders.noData')} className="min-h-64" />
        )}
        renderFilteredEmpty={() => (
          <NEmptyState
            icon={Search}
            title={t('reports.reminders.noResults', { search })}
            className="min-h-64"
          />
        )}
        headerSlot={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700">
              <Bell className="h-3.5 w-3.5" />
              {filtered.length} {t('reports.reminders.studentsOverdue')}
            </span>
            <span className="inline-flex items-center rounded-lg bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700">
              {formatMAD(totalOverdue, locale)} {t('reports.reminders.overdueAmount')}
            </span>
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
      />
    </div>
  );
};

export default RemindersPage;
