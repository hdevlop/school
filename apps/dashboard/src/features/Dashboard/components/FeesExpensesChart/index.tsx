'use client';

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { NCard } from 'najm-kit';
import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NSkeletonChart } from 'najm-kit';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { useTranslation } from 'najm-i18n/react';

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DEMO_DATA: Record<string, { income: number; expenses: number }> = {
  jan: { income: 85, expenses: 55 },
  feb: { income: 110, expenses: 75 },
  mar: { income: 95, expenses: 65 },
  apr: { income: 125, expenses: 85 },
  may: { income: 100, expenses: 70 },
  jun: { income: 145, expenses: 95 },
  jul: { income: 115, expenses: 75 },
  aug: { income: 155, expenses: 105 },
  sep: { income: 120, expenses: 80 },
  oct: { income: 160, expenses: 110 },
  nov: { income: 130, expenses: 85 },
  dec: { income: 170, expenses: 115 },
};

const FeesExpensesChart = ({ className = '' }) => {
  const { t } = useTranslation();
  const isLoading = useDelayedLoading();
  const incomeLabel = t('dashboard.totalIncomes');
  const expensesLabel = t('dashboard.totalExpenses');

  const data = useMemo(
    () => MONTH_KEYS.map((k) => ({ month: t(`common.monthsShort.${k}`), ...DEMO_DATA[k] })),
    [t],
  );

  const incomeColor = '#1e40af';
  const expensesColor = '#f97316';

  const CustomTooltip = ({ active = null, payload = null }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-800">{payload[0].payload.month}</p>
          <p className="text-sm" style={{ color: incomeColor }}>
            {incomeLabel}: <span className="font-bold">{payload[0].value}</span>
          </p>
          {payload[1] && (
            <p className="text-sm" style={{ color: expensesColor }}>
              {expensesLabel}: <span className="font-bold">{payload[1].value}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomLegend = () => (
    <div className="flex items-center justify-start gap-6 mb-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: incomeColor }}></div>
        <span className="text-sm text-gray-600">{incomeLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: expensesColor }}></div>
        <span className="text-sm text-gray-600">{expensesLabel}</span>
      </div>
    </div>
  );

  return (
    <NCard
      title={t('dashboard.feesCollectionExpenses')}
      className={cn('flex w-full h-full', className)}
      icon={DollarSign}
      loading={isLoading}
      skeleton={<NSkeletonChart />}
    >
      <div className="flex flex-col">
        <CustomLegend />
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
              domain={[0, 200]}
              ticks={[0, 50, 100, 150, 200]}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="income"
              stroke={incomeColor}
              strokeWidth={3}
              dot={false}
              name={incomeLabel}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke={expensesColor}
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={false}
              name={expensesLabel}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </NCard>
  );
};

export default FeesExpensesChart;
