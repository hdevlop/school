'use client';

import { useMemo, useState } from 'react';
import { BarChart3, CalendarCheck, UsersRound } from 'lucide-react';
import { NCard, NCardAction, NLineChart, NStatCard, SegmentedControl, cn, type NChartDatum } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import {
  TEACHER_TREND_RANGE_VALUES,
  type TeacherTrendRange,
} from '@sms/contracts/teacher-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useTeacherAttendanceTrend } from '../../hooks/useTeacherDashboard';

// The chart sits inside this card, so its own surface is made transparent.
// `.najm-border` sits outside Tailwind's layers, hence a transparent color
// rather than a zero width.
const EMBEDDED_CHART = 'gap-0 border-transparent bg-transparent p-0 shadow-none lg:p-0 2xl:p-0';

const AttendanceTrendCard = ({ className }: { className?: string }) => {
  const { t } = useTranslation();
  const { number, percent, displayDate } = useSchoolFormat();
  const [range, setRange] = useState<TeacherTrendRange>('7d');
  const { data: trend, isLoading, error, refetch } = useTeacherAttendanceTrend(range);

  // Days without marks (weekends, holidays) are left out rather than drawn as 0%.
  const data = useMemo<NChartDatum[]>(() => (trend?.points ?? [])
    .filter((point) => point.rate !== null)
    .map((point) => ({
      id: point.date,
      label: displayDate(point.date, range === '7d' ? { month: 'short', day: 'numeric' } : { day: 'numeric' }),
      values: { rate: point.rate ?? 0 },
    })), [trend?.points, range, displayDate]);

  // Typed by the shared tuple, so a range added there needs a label here.
  const rangeLabels: Record<TeacherTrendRange, string> = {
    '7d': t('dashboard.teacher.trend.range7d'),
    '30d': t('dashboard.teacher.trend.range30d'),
  };
  const ratio = (value: number | null | undefined) => percent(value == null ? null : value / 100, 0);
  const change = trend?.change ?? null;

  return (
    <NCard
      title={t('dashboard.teacher.trend.title')}
      icon={BarChart3}
      className={cn('h-full', className)}
      error={error}
      errorText={t('common.feedback.errorMessage')}
      onRetry={() => refetch()}
    >
      <NCardAction>
        <SegmentedControl<TeacherTrendRange>
          size="sm"
          value={range}
          onChange={setRange}
          ariaLabel={t('dashboard.teacher.trend.title')}
          options={TEACHER_TREND_RANGE_VALUES.map((value) => ({ value, label: rangeLabels[value] }))}
        />
      </NCardAction>

      <NLineChart
        title={null}
        ariaLabel={t('dashboard.teacher.trend.title')}
        className={EMBEDDED_CHART}
        loading={isLoading}
        data={data}
        series={[{ id: 'rate', label: t('dashboard.teacher.trend.rate'), color: 'var(--primary)' }]}
        showLegend={false}
        height={140}
        valueFormatter={ratio}
        emptyLabel={t('dashboard.teacher.trend.empty')}
      />

      <div className="grid grid-cols-2 gap-2 lg:gap-3">
        <NStatCard
          loading={isLoading}
          icon={UsersRound}
          label={t('dashboard.teacher.trend.overall')}
          value={ratio(trend?.rate)}
          change={change === null ? undefined : { value: ratio(Math.abs(change)), positive: change >= 0 }}
          subtext={t('dashboard.teacher.trend.vsPrevious')}
        />
        <NStatCard
          loading={isLoading}
          icon={CalendarCheck}
          label={t('dashboard.teacher.trend.classesHeld')}
          value={number(trend?.sessionsHeld ?? 0)}
          subtext={t('dashboard.teacher.trend.outOf', { count: number(trend?.sessionsScheduled ?? 0) })}
        />
      </div>
    </NCard>
  );
};

export default AttendanceTrendCard;
