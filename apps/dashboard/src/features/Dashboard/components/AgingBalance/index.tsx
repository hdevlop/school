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
import { CHART_AXIS_TICK_SMALL, CHART_GRID_STROKE, CHART_TOOLTIP_CLASS, compactTick } from '@/shared/chartTheme';
import { NCard } from 'najm-kit';
import { AlertTriangle } from 'lucide-react';
import { cn } from 'najm-kit';
import { NSkeletonChart } from 'najm-kit';
import { useFinanceAging } from '@/features/Dashboard/hooks/useDashboardHooks';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';

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
  majorMoney: (value: number) => string;
};

const AgingTooltip = ({ active, payload, majorMoney }: AgingTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className={CHART_TOOLTIP_CLASS}>
        <p className="text-sm font-semibold text-foreground">{payload[0].payload.label}</p>
        <p className="text-sm font-bold">{majorMoney(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const AgingBalance: React.FC<AgingBalanceProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();
  const { viewingYear } = useViewingAcademicYear();
  const { data, isLoading, error, refetch } = useFinanceAging();

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
      description={viewingYear ? t('reports.year', { year: viewingYear }) : undefined}
      icon={AlertTriangle}
      className={cn('flex w-full h-full', className)}
      loading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton={<NSkeletonChart />}
    >
      <div className="flex flex-col">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="0" stroke={CHART_GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={CHART_AXIS_TICK_SMALL}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={CHART_AXIS_TICK_SMALL}
              tickFormatter={compactTick}
            />
            <Tooltip
              content={(props) => <AgingTooltip {...(props as unknown as AgingTooltipProps)} majorMoney={majorMoney} />}
              cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
            />
            <Bar isAnimationActive={false} dataKey="value" radius={[6, 6, 0, 0]}>
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
