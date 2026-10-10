'use client';

import React, { useMemo, useState } from 'react';
import { NCard } from 'najm-kit';
import { AlertTriangle } from 'lucide-react';
import { NSkeletonEventList } from 'najm-kit';
import { useFinanceAgingDetail } from '@/features/Dashboard/hooks/useDashboardHooks';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useTranslation } from 'najm-i18n/react';
import { isAuthorizationError } from '@/services/apiError';
import { cn } from 'najm-kit';
import { useClassSectionTableScope } from '@/features/Classes/hooks/useClassSectionTableScope';

type AgingRow = {
  studentId: string;
  studentName: string;
  studentCode: string;
  classId: string | null;
  className: string;
  sectionId: string | null;
  sectionName: string | null;
  current: number;
  d1_30: number;
  d31_60: number;
  d60plus: number;
  total: number;
};

type SortKey = 'studentName' | 'className' | 'current' | 'd1_30' | 'd31_60' | 'd60plus' | 'total';

const bucketColor = (bucket: string) => {
  if (bucket === 'current') return 'text-green-600';
  if (bucket === 'd1_30') return 'text-yellow-600';
  if (bucket === 'd31_60') return 'text-orange-600';
  return 'text-red-600';
};

interface Props {
  className?: string;
}

const AgingDetailTable: React.FC<Props> = ({ className = '' }) => {
  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();
  const { data, error, isLoading } = useFinanceAgingDetail();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const rows: AgingRow[] = useMemo(() => Array.isArray(data) ? data : [], [data]);
  const { matches, filters: scopeFilters } = useClassSectionTableScope({ placements: rows });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(
      (r) => matches(r) && (
        r.studentName.toLowerCase().includes(q) ||
        r.studentCode.toLowerCase().includes(q) ||
        r.className.toLowerCase().includes(q)),
    );
  }, [rows, search, matches]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = typeof a[sortKey] === 'string' ? (a[sortKey] as string).toLowerCase() : a[sortKey];
      const bv = typeof b[sortKey] === 'string' ? (b[sortKey] as string).toLowerCase() : b[sortKey];
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totals = useMemo(
    () =>
      sorted.reduce(
        (acc, r) => ({
          current: acc.current + r.current,
          d1_30: acc.d1_30 + r.d1_30,
          d31_60: acc.d31_60 + r.d31_60,
          d60plus: acc.d60plus + r.d60plus,
          total: acc.total + r.total,
        }),
        { current: 0, d1_30: 0, d31_60: 0, d60plus: 0, total: 0 },
      ),
    [sorted],
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      <span className="ml-1 text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
    ) : (
      <span className="ml-1 text-muted-foreground/40">↕</span>
    );

  const Th = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="py-2 px-3 text-right font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground whitespace-nowrap"
      onClick={() => toggleSort(k)}
    >
      {label}
      <SortIcon k={k} />
    </th>
  );

  const buckets = [
    { label: t('reports.aging.upcoming'), value: totals.current, color: 'text-green-600 bg-green-50' },
    { label: t('reports.aging.d1_30'),    value: totals.d1_30,   color: 'text-yellow-700 bg-yellow-50' },
    { label: t('reports.aging.d31_60'),   value: totals.d31_60,  color: 'text-orange-700 bg-orange-50' },
    { label: t('reports.aging.d60plus'),  value: totals.d60plus, color: 'text-red-700 bg-red-50' },
    { label: t('reports.aging.total'),    value: totals.total,   color: 'text-primary bg-primary/10 font-bold' },
  ];

  return (
    <NCard
      title={t('reports.aging.title')}
      icon={AlertTriangle}
      className={cn('flex w-full h-full', className)}
      loading={isLoading}
      error={error ?? null}
      errorText={t(
        // `NCard` renders one message and has no forbidden state of its own, so
        // the distinction a table makes with an icon is made here in words.
        isAuthorizationError(error)
          ? 'common.feedback.forbiddenDescription'
          : 'common.feedback.errorMessage',
      )}
      skeleton={<NSkeletonEventList />}
      noData={!isLoading && rows.length === 0}
      noDataText={t('reports.aging.noData')}
    >
      <div className="flex flex-col gap-3 h-full">
        {/* Summary buckets */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {buckets.map(({ label, value, color }, index) => (
            <div
              key={label}
              // Five amounts do not fit one phone row; the total takes a row of its own.
              className={cn('rounded-lg p-2 text-center', index === buckets.length - 1 && 'col-span-2 sm:col-span-1', color)}
            >
              <p className="text-xs font-medium mb-0.5">{label}</p>
              <p className="text-sm font-bold tabular-nums">{majorMoney(value)}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex flex-col gap-2 lg:flex-row">
          <input
            type="text"
            aria-label={t('reports.aging.searchPlaceholder')}
            placeholder={t('reports.aging.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {scopeFilters.map((filter) => (
            <select
              key={filter.name}
              aria-label={filter.placeholder}
              value={filter.value}
              onChange={(event) => filter.onChange(event.target.value)}
              disabled={'disabled' in filter && filter.disabled}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 lg:w-48 lg:shrink-0"
            >
              <option value="">{filter.placeholder}</option>
              {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm z-10">
              <tr>
                <th
                  className="py-2 px-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort('studentName')}
                >
                  {t('reports.aging.student')} <SortIcon k="studentName" />
                </th>
                <th
                  className="py-2 px-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort('className')}
                >
                  {t('reports.aging.class')} <SortIcon k="className" />
                </th>
                <Th label={t('reports.aging.upcoming')} k="current" />
                <Th label={t('reports.aging.d1_30')} k="d1_30" />
                <Th label={t('reports.aging.d31_60')} k="d31_60" />
                <Th label={t('reports.aging.d60plus')} k="d60plus" />
                <Th label={t('reports.aging.total')} k="total" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && rows.length > 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">{t('emptyStates.filtered.title')}</td></tr>
              )}
              {sorted.map((r) => (
                <tr key={r.studentId} className="border-b border-border/40 hover:bg-muted/30">
                  <td className="py-2 px-3">
                    <p className="font-medium leading-tight">{r.studentName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{r.studentCode}</p>
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">{r.className}</td>
                  <td className={cn('py-2 px-3 text-right tabular-nums', bucketColor('current'))}>
                    {r.current > 0 ? majorMoney(r.current) : '—'}
                  </td>
                  <td className={cn('py-2 px-3 text-right tabular-nums', bucketColor('d1_30'))}>
                    {r.d1_30 > 0 ? majorMoney(r.d1_30) : '—'}
                  </td>
                  <td className={cn('py-2 px-3 text-right tabular-nums', bucketColor('d31_60'))}>
                    {r.d31_60 > 0 ? majorMoney(r.d31_60) : '—'}
                  </td>
                  <td className={cn('py-2 px-3 text-right tabular-nums', bucketColor('d60plus'))}>
                    {r.d60plus > 0 ? majorMoney(r.d60plus) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums font-semibold text-primary">
                    {majorMoney(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            {sorted.length > 0 && (
              <tfoot className="sticky bottom-0 bg-muted/80 backdrop-blur-sm font-semibold">
                <tr>
                  <td className="py-2 px-3" colSpan={2}>
                    {t('reports.aging.totalStudents', { count: sorted.length, plural: sorted.length > 1 ? 's' : '' })}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-green-600">{majorMoney(totals.current)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-yellow-700">{majorMoney(totals.d1_30)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-orange-700">{majorMoney(totals.d31_60)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-red-700">{majorMoney(totals.d60plus)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-primary">{majorMoney(totals.total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </NCard>
  );
};

export default AgingDetailTable;
