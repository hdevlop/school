'use client';

import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { NCard } from 'najm-kit';
import { PieChart as PieIcon } from 'lucide-react';
import { NSkeletonChart } from 'najm-kit';
import { useFinanceExpenseBreakdown } from '@/features/Dashboard/hooks/useDashboardHooks';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useTranslation } from 'najm-i18n/react';
import DashboardEmptyState from '@/features/Dashboard/components/DashboardEmptyState';
import { summarizeExpenseBreakdown, type ExpenseBreakdownRow } from '../config/expenseBreakdown';

const COLORS = [
  '#1e40af', '#f97316', '#10b981', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#84cc16', '#ec4899', '#6b7280',
  '#14b8a6', '#f43f5e', '#a855f7', '#eab308', '#22c55e',
  '#3b82f6',
];

interface Props {
  academicYear?: string;
  className?: string;
}

const CustomTooltip = ({ active, payload, majorMoney, t }: any) => {
  if (active && payload?.length) {
    const { name, value, payload: data } = payload[0];
    return (
      <div className="bg-white px-3 py-2 rounded shadow border border-gray-200 text-sm">
        <p className="font-semibold text-gray-800">{name}</p>
        <p className="text-gray-600">{majorMoney(value)}</p>
        <p className="text-gray-400">{t('dashboard.finance.expenseCount', { count: data.count })}</p>
      </div>
    );
  }
  return null;
};

const ExpenseBreakdownChart: React.FC<Props> = ({ academicYear, className = '' }) => {
  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();
  const { data, isLoading, error, refetch } = useFinanceExpenseBreakdown(academicYear);

  const rows: ExpenseBreakdownRow[] = useMemo(
    () => Array.isArray(data) ? data : [],
    [data],
  );

  const { total, noData, categories } = useMemo(() => summarizeExpenseBreakdown(rows), [rows]);

  const chartData = useMemo(
    () => {
      const categoryLabel = (key: string) => t(`expenses.categories.${key}`);
      return categories.map((r) => ({
        category: r.category,
        name: categoryLabel(r.category),
        value: r.total,
        count: r.count,
      }));
    },
    [categories, t],
  );

  return (
    <NCard
      title={t('dashboard.finance.expensesByCategory')}
      icon={PieIcon}
      className={`flex w-full h-full ${className}`}
      loading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton={<NSkeletonChart />}
      classNames={{ content: 'flex-1 min-h-0' }}
    >
      {noData ? (
        <DashboardEmptyState icon={PieIcon} title={t('dashboard.finance.noExpensesRecorded')} />
      ) : (
        <div className="flex flex-col h-full gap-1">
          <p className="text-sm text-muted-foreground">
            {t('common.total')} : <span className="font-semibold text-foreground">{majorMoney(total)}</span>
          </p>
          <div className="flex-1 min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip majorMoney={majorMoney} t={t} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1">
            {chartData.map((r, i) => (
              <div key={r.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="truncate">{r.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="tabular-nums font-medium">{majorMoney(r.value)}</span>
                  <span className="tabular-nums text-muted-foreground w-10 text-right">
                    {total > 0 ? ((r.value / total) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </NCard>
  );
};

export default ExpenseBreakdownChart;
