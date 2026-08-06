'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { NCard } from 'najm-kit';
import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NSkeletonChart } from 'najm-kit';
import { useFinanceTrend } from '@/features/Dashboard/hooks/useDashboardHooks';
import { useTranslation } from '@/hooks/useLanguage';
import { formatMAD, type SupportedLocale } from '@/lib/format';

interface IncomeExpensesTrendProps {
  className?: string;
  academicYear?: string;
}

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const EXCLUDED_MONTH_KEYS = new Set(['jul', 'aug']);
const CURRENT_MONTH_KEY = MONTH_KEYS[new Date().getMonth()];

const toLabel = (month: string, t: (k: string) => string) => {
  const [, m] = month.split('-');
  const key = MONTH_KEYS[Number(m) - 1];
  return key ? t(`common.monthsShort.${key}`) : month;
};

const INCOME_COLOR = '#1e40af';
const EXPENSES_COLOR = '#f97316';

type TooltipPayloadItem = { value: number; payload: { month: string } };
type TrendTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  locale: SupportedLocale;
  incomeLabel: string;
  expensesLabel: string;
  todayIncome: number;
  todayExpenses: number;
};

const TrendTooltip = ({
  active,
  payload,
  locale,
  incomeLabel,
  expensesLabel,
  todayIncome,
  todayExpenses,
  t,
}: TrendTooltipProps & { t: (k: string) => string }) => {
  if (active && payload && payload.length) {
    const month = payload[0].payload.month;
    const isCurrent = month === t(`common.monthsShort.${CURRENT_MONTH_KEY}`);
    return (
      <div className="bg-white px-3 py-2 rounded shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-800">{month}</p>
        <p className="text-sm" style={{ color: INCOME_COLOR }}>
          {incomeLabel}: <span className="font-bold">{formatMAD(payload[0].value, locale)}</span>
        </p>
        {payload[1] && (
          <p className="text-sm" style={{ color: EXPENSES_COLOR }}>
            {expensesLabel}: <span className="font-bold">{formatMAD(payload[1].value, locale)}</span>
          </p>
        )}
        {isCurrent && (
          <div className="border-t border-gray-100 mt-1 pt-1">
            <p className="text-sm text-gray-700">
              {t('dashboard.todayIncome')} {incomeLabel}: <span className="font-bold">{formatMAD(todayIncome, locale)}</span>
            </p>
            <p className="text-sm text-gray-700">
              {t('dashboard.todayExpenses')} {expensesLabel}: <span className="font-bold">{formatMAD(todayExpenses, locale)}</span>
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

type LegendProps = { incomeLabel: string; expensesLabel: string };
const TrendLegend = ({ incomeLabel, expensesLabel }: LegendProps) => (
  <div className="flex items-center justify-start gap-6 mb-4">
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: INCOME_COLOR }} />
      <span className="text-sm text-gray-600">{incomeLabel}</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: EXPENSES_COLOR }} />
      <span className="text-sm text-gray-600">{expensesLabel}</span>
    </div>
  </div>
);

type TrendRow = { month: string; income: number; expenses: number };

const IncomeExpensesTrend: React.FC<IncomeExpensesTrendProps> = ({ className = '', academicYear }) => {
  const { t, language } = useTranslation();
  const locale = (language as SupportedLocale) ?? 'en';
  const { data, isLoading } = useFinanceTrend(academicYear);
  const incomeLabel = t('dashboard.finance.income');
  const expensesLabel = t('dashboard.finance.expenses');

  const payload = data as
    | { monthly?: TrendRow[]; todayIncome?: number; todayExpenses?: number }
    | TrendRow[]
    | undefined;
  const todayIncome = Array.isArray(payload) ? 0 : Number(payload?.todayIncome ?? 0);
  const todayExpenses = Array.isArray(payload) ? 0 : Number(payload?.todayExpenses ?? 0);

  const chartData = useMemo<TrendRow[]>(
    () => {
      const monthly: TrendRow[] = Array.isArray(payload) ? payload : payload?.monthly ?? [];
      return monthly
        .map((row) => ({
          month: toLabel(row.month, t),
          income: Number(row.income ?? 0),
          expenses: Number(row.expenses ?? 0),
        }))
        .filter((row, idx) => {
          const originalKey = MONTH_KEYS[Number(monthly[idx]?.month.split('-')[1]) - 1];
          return !EXCLUDED_MONTH_KEYS.has(originalKey);
        });
    },
    [payload, t],
  );

  return (
    <NCard
      title={t('dashboard.finance.incomeVsExpenses')}
      className={cn('flex w-full h-full', className)}
      icon={DollarSign}
      loading={isLoading}
      skeleton={<NSkeletonChart />}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <TrendLegend incomeLabel={incomeLabel} expensesLabel={expensesLabel} />
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                dx={-10}
              />
              <Tooltip
                content={(props) => (
                  <TrendTooltip
                    {...(props as unknown as TrendTooltipProps)}
                    locale={locale}
                    incomeLabel={incomeLabel}
                    expensesLabel={expensesLabel}
                    todayIncome={todayIncome}
                    todayExpenses={todayExpenses}
                    t={t}
                  />
                )}
              />
              <Line
                type="monotone"
                dataKey="income"
                stroke={INCOME_COLOR}
                strokeWidth={3}
                dot={false}
                name={incomeLabel}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke={EXPENSES_COLOR}
                strokeWidth={3}
                strokeDasharray="5 5"
                dot={false}
                name={expensesLabel}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </NCard>
  );
};

export default IncomeExpensesTrend;
