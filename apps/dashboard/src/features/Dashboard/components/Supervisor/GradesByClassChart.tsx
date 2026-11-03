'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { GraduationCap } from 'lucide-react';
import { NCard, NSkeletonChart, cn, getNChartColor } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { compareClassNames } from '@sms/contracts';
import type { SupervisorDashboardClassGrades } from '@sms/contracts/supervisor-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import DashboardEmptyState from '../DashboardEmptyState';

type GradesByClassChartProps = {
  rows: SupervisorDashboardClassGrades[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
};

const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 };

const GradesTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: SupervisorDashboardClassGrades }[] }) => {
  const { t } = useTranslation();
  const { number, percent } = useSchoolFormat();
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-semibold">{row.className}</p>
      <p>{t('dashboard.supervisor.grades.average')}: <span className="font-bold tabular-nums">{percent(row.average / 100, 0)}</span></p>
      <p>{t('dashboard.supervisor.grades.passRate')}: <span className="font-bold tabular-nums">{percent(row.passRate / 100, 0)}</span></p>
      <p className="text-muted-foreground">{t('dashboard.supervisor.grades.graded', { count: number(row.graded) })}</p>
    </div>
  );
};

// The year's average mark in each assigned class, as a share of the total
// marks; the tooltip adds the pass rate and how many marks it counts.
const GradesByClassChart = ({ rows, loading, error, onRetry, className }: GradesByClassChartProps) => {
  const { t } = useTranslation();
  const data = useMemo(() => [...(rows ?? [])].sort((a, b) => compareClassNames(a.className, b.className)), [rows]);

  return (
    <NCard
      title={t('dashboard.supervisor.grades.title')}
      icon={GraduationCap}
      className={cn('flex h-full w-full', className)}
      loading={loading}
      error={error}
      onRetry={onRetry}
      skeleton={<NSkeletonChart />}
      classNames={{ content: 'flex-1 min-h-0' }}
    >
      {data.length ? (
        <div className="h-full min-h-56" role="img" aria-label={t('dashboard.supervisor.grades.title')}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="className" axisLine={false} tickLine={false} tick={AXIS_TICK} interval={0} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} tick={AXIS_TICK} unit="%" />
              <Tooltip content={<GradesTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
              <Bar dataKey="average" name={t('dashboard.supervisor.grades.average')} fill={getNChartColor(0)} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <DashboardEmptyState icon={GraduationCap} title={t('dashboard.supervisor.grades.empty')} />
      )}
    </NCard>
  );
};

export default GradesByClassChart;
