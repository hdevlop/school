'use client';

import { NBadge, NAvatar, NButton, NEmptyState, NErrorState, NForbiddenState, NPageHeader, NPageHeaderActions } from 'najm-kit';
import Link from 'next/link';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import React, { useEffect, useId, useMemo, useState } from 'react';
import { Bell, BellRing, Search } from 'lucide-react';
import { useFinanceOverdue } from '@/features/Dashboard/hooks/useDashboardHooks';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useTranslation } from 'najm-i18n/react';
import { cn } from 'najm-kit';
import { hasFailedToLoad, isAuthorizationError, isCountUnknown } from '@/services/apiError';
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
  const deliveryDescriptionId = useId();

  useEffect(() => {
    setPlacementFilter({ yearKey, classId: '', sectionId: '' });
  }, [yearKey]);

  const rows: OverdueRow[] = useMemo(() => Array.isArray(data) ? data : [], [data]);
  const failed = hasFailedToLoad(error, rows);
  const countUnknown = isCountUnknown(error, rows, isLoading);

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
        return (
          <Link href={`/students/${row.original.studentId}/fees`} className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            <NAvatar src={row.original.studentImage} title={row.original.studentName} size="sm" />
          </Link>
        );
      },
    },
    {
      accessorKey: 'daysOverdue',
      header: t('reports.reminders.overdueAmount') || 'Overdue',
      enableSorting: true,
      cell: ({ row }: any) => {
        return (
          <NBadge
            className={cn(
              'inline-flex whitespace-nowrap rounded-full font-semibold',
              urgencyBadge(row.original.daysOverdue),
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
        return (
          <span className="whitespace-nowrap font-bold tabular-nums text-red-600">
            {majorMoney(row.original.totalOverdue)}
          </span>
        );
      },
    },
    {
      id: 'reminder',
      header: t('reports.reminders.remind') || 'Reminder',
      enableSorting: false,
      cell: () => (
          <NButton
            size="sm"
            variant="outline"
            disabled
            aria-describedby={deliveryDescriptionId}
            className="h-8 gap-1.5"
          >
            <Bell className="h-3.5 w-3.5" />
            {t('reports.reminders.remind')}
          </NButton>
      ),
    },
  ], [deliveryDescriptionId, displayDateOnly, majorMoney, t]);

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      <NPageHeader
        icon={BellRing}
        title={t('reports.reminders.title')}
        subtitle={countUnknown ? (viewingYear ? t('reports.year', { year: viewingYear }) : undefined) : `${viewingYear ? `${t('reports.year', { year: viewingYear })} · ` : ''}${t('reports.reminders.studentsOverdueCount', { count: filtered.length })} · ${majorMoney(totalOverdue)}`}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      <p id={deliveryDescriptionId} className="text-sm text-muted-foreground">
        {t('reports.reminders.toastSmsComingSoon')}
      </p>
      <NTable
        data={filtered}
        columns={columns}
        filters={filters}
        loading={isLoading}
        error={failed ? error : null}
        renderError={(currentError) => isAuthorizationError(currentError)
          ? <NForbiddenState surface="panel" />
          : <NErrorState surface="panel" />}
        getRowId={(row) => row.studentId}
        getRowClassName={(row) => cn(
          'border-l-4',
          urgencyRowColor(row.daysOverdue),
        )}
        defaultSorting={[{ id: 'daysOverdue', desc: true }]}
        defaultMode="table"
        availableModes={['table', 'cards']}
        renderCard={({ data: row }: { data: OverdueRow }) => (
          <ReminderCard
            data={row}
            deliveryDescriptionId={deliveryDescriptionId}
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
        headerSlot={countUnknown ? null : (
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
              disabled
              aria-describedby={deliveryDescriptionId}
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
