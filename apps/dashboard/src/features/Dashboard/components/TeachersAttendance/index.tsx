import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserCheck } from 'lucide-react';
import { NCard } from 'najm-kit';
import { NSkeletonChart } from 'najm-kit';
import { cn } from '@/lib/utils';
import { useTranslation } from 'najm-i18n/react';
import { useStaffAttendanceMonthly } from '../../hooks/useDashboardHooks';

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const EXCLUDED_MONTH_KEYS = new Set(['jul', 'aug']);
const CURRENT_MONTH_KEY = MONTH_KEYS[new Date().getMonth()];

const ABSENT_COLOR = '#E11D48';
const LATE_COLOR = '#F1B814';

interface TeachersAttendanceProps {
  className?: string;
}

const CustomTooltip = ({ active = null, payload = null, todayAbsent = 0, todayLate = 0, t }: any) => {
  if (active && payload && payload.length) {
    const month = payload[0].payload.month;
    const isCurrent = month === CURRENT_MONTH_KEY;
    const absent = payload.find((p: any) => p.dataKey === 'absent')?.value ?? 0;
    const late = payload.find((p: any) => p.dataKey === 'late')?.value ?? 0;
    return (
      <div className="bg-white px-3 py-2 rounded shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-800">{month}</p>
        <p className="text-sm" style={{ color: ABSENT_COLOR }}>
          {t('dashboard.attendance.absent')}: <span className="font-bold">{absent}</span>
        </p>
        <p className="text-sm" style={{ color: LATE_COLOR }}>
          {t('dashboard.attendance.late')}: <span className="font-bold">{late}</span>
        </p>
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

const TeachersAttendance: React.FC<TeachersAttendanceProps> = ({ className }) => {
  const { t } = useTranslation();
  const { data: payload, isLoading, error, refetch } = useStaffAttendanceMonthly();

  const data = useMemo(() => {
    const monthly: { month: string; absent?: number; late?: number; present: number; total: number }[] = payload?.monthly ?? [];
    return monthly
      .map((m) => {
        const idx = Number(m.month.split('-')[1]) - 1;
        const monthKey = MONTH_KEYS[idx] ?? null;
        return {
          month: monthKey ? t(`common.monthsShort.${monthKey}`) : m.month,
          absent: m.absent ?? 0,
          late: m.late ?? 0,
        };
      })
      .filter((entry, idx) => {
        const originalKey = MONTH_KEYS[Number(monthly[idx]?.month.split('-')[1]) - 1];
        return !EXCLUDED_MONTH_KEYS.has(originalKey);
      });
  }, [payload, t]);

  const todayAbsent = payload?.todayAbsent ?? 0;
  const todayLate = payload?.todayLate ?? 0;

  const noData = !data.length || data.every((d) => d.absent === 0 && d.late === 0);

  return (
    <NCard
      title={t('dashboard.attendance.staffTitle')}
      icon={UserCheck}
      className={cn('flex w-full h-full', className)}
      loading={isLoading}
      error={error}
      noData={noData}
      onRetry={() => refetch()}
      skeleton={<NSkeletonChart />}
    >
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ABSENT_COLOR }} />
          <span className="text-sm text-gray-600">{t('dashboard.attendance.absent')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: LATE_COLOR }} />
          <span className="text-sm text-gray-600">{t('dashboard.attendance.late')}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip todayAbsent={todayAbsent} todayLate={todayLate} t={t} />} />
            <Bar dataKey="absent" name={t('dashboard.attendance.absent')} fill={ABSENT_COLOR} radius={[6, 6, 0, 0]} maxBarSize={14} />
            <Bar dataKey="late" name={t('dashboard.attendance.late')} fill={LATE_COLOR} radius={[6, 6, 0, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </NCard>
  );
};

export default TeachersAttendance;
