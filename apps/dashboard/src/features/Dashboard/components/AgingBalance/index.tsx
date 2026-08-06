'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { NCard } from 'najm-kit';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NSkeletonChart } from 'najm-kit';
import { useFinanceAging } from '@/features/Dashboard/hooks/useDashboardHooks';
import { useTranslation } from '@/hooks/useLanguage';
import { formatMAD, type SupportedLocale } from '@/lib/format';

interface AgingBalanceProps {
  className?: string;
}

const COLORS = ['#10b981', '#facc15', '#fb923c', '#ef4444'];

type TooltipPayloadItem = {
  value: number;
  payload: { label: string };
};

type AgingTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  locale: SupportedLocale;
};

const AgingTooltip = ({ active, payload, locale }: AgingTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-3 py-2 rounded shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-800">{payload[0].payload.label}</p>
        <p className="text-sm font-bold">{formatMAD(payload[0].value, locale)}</p>
      </div>
    );
  }
  return null;
};

const AgingBalance: React.FC<AgingBalanceProps> = ({ className = '' }) => {
  const { t, language } = useTranslation();
  const locale = (language as SupportedLocale) ?? 'en';
  const { data, isLoading } = useFinanceAging();

  const chartData = useMemo(
    () => [
      { key: 'current', label: t('dashboard.finance.agingCurrent'), value: Number(data?.current ?? 0) },
      { key: 'd1_30', label: t('dashboard.finance.aging1_30'), value: Number(data?.d1_30 ?? 0) },
      { key: 'd31_60', label: t('dashboard.finance.aging31_60'), value: Number(data?.d31_60 ?? 0) },
      { key: 'd60plus', label: t('dashboard.finance.aging60plus'), value: Number(data?.d60plus ?? 0) },
    ],
    [data, t],
  );

  return (
    <NCard
      title={t('dashboard.finance.agingBalance')}
      icon={AlertTriangle}
      className={cn('flex w-full h-full', className)}
      loading={isLoading}
      skeleton={<NSkeletonChart />}
    >
      <div className="flex flex-col">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 11 }}
            />
            <Tooltip
              content={(props) => <AgingTooltip {...(props as unknown as AgingTooltipProps)} locale={locale} />}
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </NCard>
  );
};

export default AgingBalance;
