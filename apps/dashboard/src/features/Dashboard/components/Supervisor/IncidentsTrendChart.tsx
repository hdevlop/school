'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ShieldAlert } from 'lucide-react';
import { NCard, NSkeletonChart, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { SupervisorDashboardIncidentMonth } from '@sms/contracts/supervisor-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import DashboardEmptyState from '../DashboardEmptyState';
import { hasNoFigures, monthValue } from '../../config/monthTrend';

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const EXCLUDED_MONTH_KEYS = new Set(['jul', 'aug']);
const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
type Severity = typeof SEVERITIES[number];

// Severity is ordered, so it is one hue stepping away from the surface: darker
// on light, lighter on dark. Both ramps pass the dataviz ordinal checks.
const SEVERITY_FILL: Record<Severity, string> = {
  low: 'var(--incident-low)',
  medium: 'var(--incident-medium)',
  high: 'var(--incident-high)',
  critical: 'var(--incident-critical)',
};
const SEVERITY_RAMP = [
  '[--incident-low:#FB7185] [--incident-medium:#F43F5E] [--incident-high:#BE123C] [--incident-critical:#881337]',
  'dark:[--incident-low:#9F1239] dark:[--incident-medium:#E11D48] dark:[--incident-high:#FB7185] dark:[--incident-critical:#FDA4AF]',
].join(' ');

const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 };

type Row = { month: string } & Record<Severity, number | null>;

type IncidentsTrendChartProps = {
  monthly: SupervisorDashboardIncidentMonth[] | undefined;
  businessDate: string | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
};

const IncidentsTooltip = ({ active, payload, label }: { active?: boolean; label?: string; payload?: { dataKey: Severity; value: number | null }[] }) => {
  const { t } = useTranslation();
  const { number } = useSchoolFormat();
  if (!active || !payload?.length || payload.every((entry) => entry.value == null)) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-semibold">{label}</p>
      {[...payload].reverse().map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: SEVERITY_FILL[entry.dataKey] }} aria-hidden="true" />
          {t(`discipline.severity.${entry.dataKey}`)}: <span className="font-bold tabular-nums">{number(entry.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
};

// Incidents reported each month of the year in the assigned classes, stacked
// from least to most severe.
const IncidentsTrendChart = ({ monthly, businessDate, loading, error, onRetry, className }: IncidentsTrendChartProps) => {
  const { t } = useTranslation();

  const data = useMemo<Row[]>(() => (monthly ?? [])
    .filter((row) => !EXCLUDED_MONTH_KEYS.has(MONTH_KEYS[Number(row.month.split('-')[1]) - 1]))
    .map((row) => {
      const key = MONTH_KEYS[Number(row.month.split('-')[1]) - 1];
      return {
        month: key ? t(`common.monthsShort.${key}`) : row.month,
        ...Object.fromEntries(SEVERITIES.map((severity) => [severity, monthValue(row[severity], row.month, businessDate)])),
      } as Row;
    }), [monthly, businessDate, t]);
  const noData = !data.length || hasNoFigures(data, (row) => SEVERITIES.map((severity) => row[severity]));

  return (
    <NCard
      title={t('dashboard.supervisor.incidentsTrend.title')}
      icon={ShieldAlert}
      className={cn('flex h-full w-full', SEVERITY_RAMP, className)}
      loading={loading}
      error={error}
      onRetry={onRetry}
      skeleton={<NSkeletonChart />}
      classNames={{ content: 'flex-1 min-h-0' }}
    >
      {noData ? (
        <DashboardEmptyState icon={ShieldAlert} title={t('dashboard.supervisor.incidentsTrend.empty')} />
      ) : (
        <div className="flex h-full min-h-56 flex-col">
          <ul className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            {SEVERITIES.map((severity) => (
              <li key={severity} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="size-3 rounded-full" style={{ backgroundColor: SEVERITY_FILL[severity] }} aria-hidden="true" />
                {t(`discipline.severity.${severity}`)}
              </li>
            ))}
          </ul>
          <div className="min-h-0 flex-1" role="img" aria-label={t('dashboard.supervisor.incidentsTrend.title')}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={AXIS_TICK} />
                <Tooltip content={<IncidentsTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                {SEVERITIES.map((severity, index) => (
                  <Bar
                    key={severity}
                    dataKey={severity}
                    stackId="severity"
                    name={t(`discipline.severity.${severity}`)}
                    fill={SEVERITY_FILL[severity]}
                    // A surface gap between the stacked segments.
                    stroke="var(--card)"
                    strokeWidth={1.5}
                    radius={index === SEVERITIES.length - 1 ? [4, 4, 0, 0] : 0}
                    maxBarSize={18}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </NCard>
  );
};

export default IncidentsTrendChart;
