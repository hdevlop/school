'use client';

import { useMemo } from 'react';
import { Bar, BarChart, LabelList, Tooltip, XAxis } from 'recharts';
import { DeferredChart } from '@/shared/DeferredChart';
import { BarChart3 } from 'lucide-react';
import { NCard, NSkeletonChart, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { RegistrarDashboardGrades } from '@sms/contracts/registrar-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import DashboardEmptyState from '../DashboardEmptyState';
import { GRADE_FILL, GRADE_FILL_CLASS } from './gradeChartColor';

const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 };

type Row = { band: string; count: number };

type GradeDistributionChartProps = {
  distribution: RegistrarDashboardGrades['distribution'] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
};

// How the year's marks spread across percentage bands. Each count sits on its
// column, so the tooltip only adds the share of all grades.
export default function GradeDistributionChart({ distribution, loading, error, onRetry, className }: GradeDistributionChartProps) {
  const { t } = useTranslation();
  const { number, percent } = useSchoolFormat();
  const rows = useMemo<Row[]>(() => (distribution ?? []).map(({ band, count }) => ({ band: `${band.replace('-', '–')}%`, count })), [distribution]);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const title = t('dashboard.registrar.distribution.title');

  return (
    <NCard
      title={title}
      icon={BarChart3}
      className={cn('flex h-full w-full', GRADE_FILL_CLASS, className)}
      loading={loading}
      error={error}
      onRetry={onRetry}
      skeleton={<NSkeletonChart />}
      classNames={{ content: 'flex-1 min-h-0' }}
    >
      {!total ? (
        <DashboardEmptyState icon={BarChart3} title={t('dashboard.registrar.distribution.empty')} />
      ) : (
        <div className="h-full min-h-56" role="img" aria-label={title}>
          <DeferredChart>
            <BarChart data={rows} margin={{ top: 20, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="band" axisLine={{ stroke: 'var(--border)' }} tickLine={false} tick={AXIS_TICK} interval={0} />
              <Tooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                content={({ active, payload, label }) => {
                  const count = Number(payload?.[0]?.value ?? 0);
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
                      <p className="font-semibold">{label}</p>
                      <p>{t('dashboard.registrar.gradedCount', { count: number(count) })}</p>
                      <p className="text-muted-foreground">{percent(count / total, 0)}</p>
                    </div>
                  );
                }}
              />
              <Bar isAnimationActive={false} dataKey="count" fill={GRADE_FILL} radius={[4, 4, 0, 0]} maxBarSize={24}>
                <LabelList dataKey="count" position="top" formatter={(value: unknown) => number(Number(value))} style={{ fill: 'var(--foreground)', fontSize: 12 }} />
              </Bar>
            </BarChart>
          </DeferredChart>
        </div>
      )}
    </NCard>
  );
}
