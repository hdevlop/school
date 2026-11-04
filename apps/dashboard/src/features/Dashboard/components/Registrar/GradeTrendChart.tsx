'use client';

import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { NCard, NSkeletonChart, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { RegistrarDashboardGrades } from '@sms/contracts/registrar-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import DashboardEmptyState from '../DashboardEmptyState';
import { gradeTrendRows } from '../../config/registrarDashboard';
import { GRADE_FILL, GRADE_FILL_CLASS } from './gradeChartColor';

const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 };

type GradeTrendChartProps = {
  monthly: RegistrarDashboardGrades['monthly'] | undefined;
  businessDate: string | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
};

// The school's average grade each month. Months with no grades are gaps, so
// each point carries a dot: a lone month would otherwise draw nothing.
export default function GradeTrendChart({ monthly, businessDate, loading, error, onRetry, className }: GradeTrendChartProps) {
  const { t } = useTranslation();
  const { number, percent } = useSchoolFormat();
  const rows = useMemo(() => gradeTrendRows(monthly ?? [], businessDate)
    .map((row) => ({ ...row, label: t(`common.monthsShort.${row.monthKey}`) })), [monthly, businessDate, t]);
  const title = t('dashboard.registrar.trend.title');

  return (
    <NCard
      title={title}
      icon={TrendingUp}
      className={cn('flex h-full w-full', GRADE_FILL_CLASS, className)}
      loading={loading}
      error={error}
      onRetry={onRetry}
      skeleton={<NSkeletonChart />}
      classNames={{ content: 'flex-1 min-h-0' }}
    >
      {rows.every((row) => row.average == null) ? (
        <DashboardEmptyState icon={TrendingUp} title={t('dashboard.registrar.trend.empty')} />
      ) : (
        <div className="h-full min-h-56" role="img" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                tickFormatter={(value: number) => percent(value / 100, 0)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
                  if (!active || row?.average == null) return null;
                  return (
                    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
                      <p className="font-semibold">{label}</p>
                      <p className="font-bold">{percent(row.average / 100, 0)}</p>
                      <p className="text-muted-foreground">{t('dashboard.registrar.gradedCount', { count: number(row.graded) })}</p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="average"
                stroke={GRADE_FILL}
                strokeWidth={2}
                dot={{ r: 4, fill: GRADE_FILL, stroke: 'var(--card)', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: GRADE_FILL, stroke: 'var(--card)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </NCard>
  );
}
