import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { NCard } from 'najm-kit';
import { ClipboardCheck } from 'lucide-react';
import { cn } from 'najm-kit';
import { NSkeletonChart } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useStudentAttendanceMonthly } from '../../hooks/useDashboardHooks';
import DashboardEmptyState from '../DashboardEmptyState';
import { useBusinessDate } from '@/features/Settings/hooks/useSettings';
import { hasNoFigures, monthValue } from '../../config/monthTrend';

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const EXCLUDED_MONTH_KEYS = new Set(['jul', 'aug']);
const CURRENT_MONTH_KEY = MONTH_KEYS[new Date().getMonth()];

const ABSENT_COLOR = '#E11D48';
const LATE_COLOR = '#F1B814';

type Row = { month: string; absent: number | null; late: number | null };

const CustomTooltip = ({ active = null, payload = null, todayAbsent = null, todayLate = null, t }: any) => {
  // A month that has not happened has no figures to show.
  if (active && payload && payload.length && payload[0].value != null) {
    const month = payload[0].payload.month;
    // Another school year has no today: the server sends no figures for it.
    const isCurrent = month === CURRENT_MONTH_KEY && todayAbsent != null;
    return (
      <div className="bg-white px-3 py-2 rounded shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-800">{month}</p>
        <p className="text-sm" style={{ color: ABSENT_COLOR }}>
          {t('dashboard.attendance.absent')}: <span className="font-bold">{payload[0].value}</span>
        </p>
        {payload[1] && (
          <p className="text-sm" style={{ color: LATE_COLOR }}>
            {t('dashboard.attendance.late')}: <span className="font-bold">{payload[1].value}</span>
          </p>
        )}
        {isCurrent && (
          <div className="border-t border-gray-100 mt-1 pt-1">
            <p className="text-sm" style={{ color: ABSENT_COLOR }}>
              {t('dashboard.attendance.todayAbsent')}: <span className="font-bold">{todayAbsent}</span>
            </p>
            <p className="text-sm" style={{ color: LATE_COLOR }}>
              {t('dashboard.attendance.todayLate')}: <span className="font-bold">{todayLate}</span>
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const Legend = ({ t }: { t: (k: string) => string }) => (
  <div className="flex items-center justify-start gap-6 mb-4">
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ABSENT_COLOR }} />
      <span className="text-sm text-gray-600">{t('dashboard.attendance.absent')}</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: LATE_COLOR }} />
      <span className="text-sm text-gray-600">{t('dashboard.attendance.late')}</span>
    </div>
  </div>
);

const StudentAttendanceChart = ({ className }: { className?: string }) => {
  const { t } = useTranslation();
  const { data: payload, isLoading, error, refetch } = useStudentAttendanceMonthly();
  const { businessDate } = useBusinessDate();

  const data = useMemo<Row[]>(() => {
    const monthly: { month: string; absent?: number; late?: number }[] = payload?.monthly ?? [];
    return monthly
      .map((m) => {
        const idx = Number(m.month.split('-')[1]) - 1;
        const monthKey = MONTH_KEYS[idx] ?? null;
        return {
          month: monthKey ? t(`common.monthsShort.${monthKey}`) : m.month,
          absent: monthValue(m.absent, m.month, businessDate),
          late: monthValue(m.late, m.month, businessDate),
        };
      })
      .filter((entry, idx) => {
        const originalKey = MONTH_KEYS[Number(monthly[idx]?.month.split('-')[1]) - 1];
        return !EXCLUDED_MONTH_KEYS.has(originalKey);
      });
  }, [payload, t, businessDate]);

  const todayAbsent = payload?.todayAbsent ?? null;
  const noData = !data.length || hasNoFigures(data, (d) => [d.absent, d.late]);

  return (
    <NCard
      title={t('dashboard.attendance.studentsTitle')}
      className={cn('flex w-full h-full', className)}
      icon={ClipboardCheck}
      loading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton={<NSkeletonChart />}
      classNames={{ content: 'flex-1 min-h-0' }}
    >
      {noData ? (
        <DashboardEmptyState icon={ClipboardCheck} title={t('common.feedback.emptyTitle')} />
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <Legend t={t} />
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
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
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip todayAbsent={todayAbsent} todayLate={payload?.todayLate ?? null} t={t} />} />
                <Line
                  type="monotone"
                  dataKey="absent"
                  stroke={ABSENT_COLOR}
                  strokeWidth={3}
                  dot={false}
                  name={t('dashboard.attendance.absent')}
                />
                <Line
                  type="monotone"
                  dataKey="late"
                  stroke={LATE_COLOR}
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={false}
                  name={t('dashboard.attendance.late')}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </NCard>
  );
};

export default StudentAttendanceChart;
