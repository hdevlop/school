'use client';

import { CalendarDays, CalendarX2, Bell, ClipboardCheck, Layers3, ShieldAlert, Star, UserX, UsersRound } from 'lucide-react';
import { NButton, NErrorState, NForbiddenState } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { compareClassNames } from '@sms/contracts';
import { isAuthorizationError } from '@/services/apiError';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useMonitorOverview } from '../../hooks/useMonitorDashboard';
import { MONITOR_DASHBOARD_LINKS } from '../../config/monitorDashboardLinks';
import TeacherInfoCard from '../Teacher/TeacherInfoCard';
import { AttentionCard, type AttentionRow } from '../Teacher/NeedsAttentionCard';
import QuickActionsCard, { type QuickAction } from '../Teacher/QuickActionsCard';
import MonitorKpis from './MonitorKpis';
import RegistersCard from './RegistersCard';
import TodayRoutineCard from './TodayRoutineCard';
import CalendarCard from '../CalendarCard';
import { StudentsGenderChartCard } from '../StudentsGenderChart';
import { StudentAttendanceChartCard } from '../StudentAttendanceChart';
import DashboardOverviewRow from '../DashboardOverviewRow';

const action = (key: string, icon: QuickAction['icon'], href: string): QuickAction => ({
  key,
  label: `dashboard.monitor.quickActions.${key}`,
  hint: `dashboard.monitor.quickActions.${key}Hint`,
  icon,
  href,
});

// A monitor's everyday tasks. Every destination is a route their
// sidebar already offers.
const ACTIONS: QuickAction[] = [
  action('takeAttendance', ClipboardCheck, MONITOR_DASHBOARD_LINKS.attendance),
  action('reportIncident', ShieldAlert, MONITOR_DASHBOARD_LINKS.discipline),
  action('recordReward', Star, MONITOR_DASHBOARD_LINKS.behaviorRewards),
  action('viewTimetable', CalendarDays, MONITOR_DASHBOARD_LINKS.timetable),
  action('viewStudents', UsersRound, MONITOR_DASHBOARD_LINKS.students),
];

/** The school's business date the overview describes, for a page header. */
export const MonitorOverviewDate = () => {
  const { displayDate } = useSchoolFormat();
  const { data: overview } = useMonitorOverview();
  if (!overview) return null;
  return (
    <NButton type="button" variant="outline" size="sm" className="gap-2 max-md:hidden">
      <CalendarDays className="size-4" />
      {displayDate(overview.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    </NButton>
  );
};

const MonitorOverview = () => {
  const { t } = useTranslation();
  const { data: overview, isLoading, error, refetch } = useMonitorOverview();
  // A background refresh that fails keeps the figures already on screen.
  const loadError = overview ? null : error;
  const retry = () => { void refetch(); };
  const cardState = { loading: isLoading, error: loadError, onRetry: retry };

  // Without an overview every figure would read 0, which says "nothing to do".
  if (loadError) {
    if (isAuthorizationError(loadError)) return <NForbiddenState surface="panel" className="min-h-80" />;
    return <NErrorState surface="panel" title={t('common.feedback.errorTitle')} onRetry={retry} className="min-h-80" />;
  }

  const attention = overview?.attention;
  const attentionRows: AttentionRow[] = [
    { key: 'missingRegisters', label: t('dashboard.monitor.attention.missingRegisters'), icon: CalendarX2, dot: 'bg-rose-500', href: MONITOR_DASHBOARD_LINKS.attendance, count: attention?.missingRegisters },
    { key: 'absentToday', label: t('dashboard.monitor.attention.absentToday'), icon: UserX, dot: 'bg-amber-500', href: MONITOR_DASHBOARD_LINKS.attendance, count: attention?.absentToday },
    { key: 'unreadNotifications', label: t('dashboard.teacher.attention.notifications'), icon: Bell, dot: 'bg-sky-500', href: MONITOR_DASHBOARD_LINKS.notifications, count: attention?.unreadNotifications },
  ];
  const grades = [...(overview?.manager.grades ?? [])].sort(compareClassNames);

  return (
    <div className="flex min-h-full flex-col gap-3 pb-1 xl:fit:h-full">
      <MonitorKpis kpis={overview?.kpis} loading={isLoading} />

      <DashboardOverviewRow>
        <TeacherInfoCard
          person={overview?.manager}
          jobTitle={t('staff.roles.monitor')}
          subtitle={(
            <p className="flex max-w-full items-center gap-1.5 text-sm text-muted-foreground">
              <Layers3 className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {grades.length
                  ? t('dashboard.monitor.info.grades', { grades: grades.join(', ') })
                  : t('dashboard.monitor.info.noGrades')}
              </span>
            </p>
          )}
          {...cardState}
        />
        <RegistersCard sections={overview?.sections} {...cardState} />
        <StudentAttendanceChartCard
          payload={overview?.attendanceMonthly}
          businessDate={overview?.date}
          className="min-h-[20rem] xl:min-h-0"
          {...cardState}
        />
        <StudentsGenderChartCard
          rows={overview?.studentsByGender.map((row) => ({
            ...row,
            name: t(row.gender === 'M' ? 'common.male' : 'common.female'),
          }))}
          className="min-h-[23rem] xl:min-h-0"
          {...cardState}
        />
      </DashboardOverviewRow>

      <DashboardOverviewRow>
        <TodayRoutineCard overview={overview} {...cardState} />
        <AttentionCard rows={attentionRows} {...cardState} />
        <QuickActionsCard actions={ACTIONS} dense />
        <CalendarCard dense className="min-h-[23rem] xl:min-h-0" />
      </DashboardOverviewRow>
    </div>
  );
};

export default MonitorOverview;
