'use client';

import type { ReactNode } from 'react';
import { Bell, CalendarDays, CalendarX2, ClipboardCheck, DoorOpen, Layers3, Megaphone, ShieldAlert, Star, UserX, UsersRound } from 'lucide-react';
import { NButton, NErrorState, NForbiddenState, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { compareClassNames } from '@sms/contracts';
import { isAuthorizationError } from '@/services/apiError';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useSupervisorOverview } from '../../hooks/useSupervisorDashboard';
import { SUPERVISOR_DASHBOARD_LINKS } from '../../config/supervisorDashboardLinks';
import TeacherInfoCard from '../Teacher/TeacherInfoCard';
import { AttentionCard, type AttentionRow } from '../Teacher/NeedsAttentionCard';
import QuickActionsCard, { type QuickAction } from '../Teacher/QuickActionsCard';
import RegistersCard from '../FloorManager/RegistersCard';
import AbsencesCard from '../FloorManager/AbsencesCard';
import IncidentsCard from '../FloorManager/IncidentsCard';
import CalendarCard from '../CalendarCard';
import { StudentsGenderChartCard } from '../StudentsGenderChart';
import { StudentAttendanceChartCard } from '../StudentAttendanceChart';
import SupervisorKpis from './SupervisorKpis';
import GradesByClassChart from './GradesByClassChart';
import IncidentsTrendChart from './IncidentsTrendChart';

// Each row spreads its cards over the columns they need on a large screen, so
// a card left out for a missing permission leaves no hole; the page scrolls.
const COLUMNS: Record<number, string> = { 1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4' };
const Row = ({ children }: { children: ReactNode[] }) => {
  const cards = children.filter(Boolean);
  if (!cards.length) return null;
  return (
    <div className={cn('grid grid-cols-1 gap-3 md:grid-cols-2 [&>*]:min-w-0 xl:min-h-[23rem]', COLUMNS[cards.length])}>
      {cards}
    </div>
  );
};

const action = (key: string, icon: QuickAction['icon'], href: string): QuickAction => ({
  key,
  label: `dashboard.supervisor.quickActions.${key}`,
  hint: `dashboard.supervisor.quickActions.${key}Hint`,
  icon,
  href,
});

// A supervisor's everyday tasks, each shown for the permission its page asks for.
const ACTIONS: { permission: string; action: QuickAction }[] = [
  { permission: 'create:attendance', action: action('takeAttendance', ClipboardCheck, SUPERVISOR_DASHBOARD_LINKS.attendance) },
  { permission: 'create:discipline', action: action('reportIncident', ShieldAlert, SUPERVISOR_DASHBOARD_LINKS.discipline) },
  { permission: 'create:behavior-rewards', action: action('recordReward', Star, SUPERVISOR_DASHBOARD_LINKS.behaviorRewards) },
  { permission: 'read:visit-requests', action: action('visitRequests', DoorOpen, SUPERVISOR_DASHBOARD_LINKS.visitRequests) },
  { permission: 'create:announcements', action: action('sendAnnouncement', Megaphone, SUPERVISOR_DASHBOARD_LINKS.announcements) },
  { permission: 'read:students', action: action('viewStudents', UsersRound, SUPERVISOR_DASHBOARD_LINKS.students) },
];

/** The school's business date the overview describes, for a page header. */
export const SupervisorOverviewDate = () => {
  const { displayDate } = useSchoolFormat();
  const { data: overview } = useSupervisorOverview();
  if (!overview) return null;
  return (
    <NButton type="button" variant="outline" size="sm" className="gap-2 max-md:hidden">
      <CalendarDays className="size-4" />
      {displayDate(overview.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    </NButton>
  );
};

const SupervisorOverview = () => {
  const { t } = useTranslation();
  const { can } = useViewerRole();
  const { data: overview, isLoading, error, refetch } = useSupervisorOverview();
  // A background refresh that fails keeps the figures already on screen.
  const loadError = overview ? null : error;
  const retry = () => { void refetch(); };
  const cardState = { loading: isLoading, error: loadError, onRetry: retry };

  // Without an overview every figure would read 0, which says "nothing to do".
  if (loadError) {
    if (isAuthorizationError(loadError)) return <NForbiddenState surface="panel" className="min-h-80" />;
    return <NErrorState surface="panel" title={t('common.feedback.errorTitle')} onRetry={retry} className="min-h-80" />;
  }

  // While loading, every card shows its skeleton; once loaded, a part the
  // server left out (no permission) takes its cards with it.
  const shows = (part: 'attendance' | 'students' | 'discipline' | 'grades' | 'visitRequests') => isLoading || !!overview?.[part];
  const { attendance, discipline, visitRequests } = overview ?? {};

  const attentionRows: AttentionRow[] = [
    ...(shows('attendance') ? [
      { key: 'missingRegisters', label: t('dashboard.floorManager.attention.missingRegisters'), icon: CalendarX2, dot: 'bg-rose-500', href: SUPERVISOR_DASHBOARD_LINKS.attendance, count: attendance?.missingRegisters },
      { key: 'absentToday', label: t('dashboard.floorManager.attention.absentToday'), icon: UserX, dot: 'bg-amber-500', href: SUPERVISOR_DASHBOARD_LINKS.attendance, count: attendance?.absentToday },
    ] : []),
    ...(shows('discipline') ? [
      { key: 'openIncidents', label: t('dashboard.floorManager.attention.openIncidents'), icon: ShieldAlert, dot: 'bg-violet-500', href: SUPERVISOR_DASHBOARD_LINKS.discipline, count: discipline?.openIncidents },
    ] : []),
    ...(shows('visitRequests') ? [
      { key: 'newVisitRequests', label: t('dashboard.supervisor.kpis.newVisitRequests'), icon: DoorOpen, dot: 'bg-emerald-500', href: SUPERVISOR_DASHBOARD_LINKS.visitRequests, count: visitRequests?.newRequests },
    ] : []),
    { key: 'unreadNotifications', label: t('dashboard.teacher.attention.notifications'), icon: Bell, dot: 'bg-sky-500', href: SUPERVISOR_DASHBOARD_LINKS.notifications, count: overview?.unreadNotifications },
  ];
  const actions = ACTIONS.filter((entry) => can(entry.permission)).map((entry) => entry.action);
  const classes = [...(overview?.supervisor.classes ?? [])].sort(compareClassNames);

  return (
    <div className="flex min-h-full flex-col gap-3 pb-1">
      <SupervisorKpis overview={overview} loading={isLoading} />

      <Row>
        <TeacherInfoCard
          person={overview?.supervisor}
          subtitle={(
            <p className="flex max-w-full items-center gap-1.5 text-sm text-muted-foreground">
              <Layers3 className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {classes.length
                  ? t('dashboard.supervisor.info.classes', { classes: classes.join(', ') })
                  : t('dashboard.supervisor.info.noClasses')}
              </span>
            </p>
          )}
          {...cardState}
        />
        {shows('attendance') && (
          <RegistersCard sections={attendance?.sections} emptyText={t('dashboard.supervisor.registers.empty')} {...cardState} />
        )}
        {shows('attendance') && <AbsencesCard absences={attendance?.absences} schoolDay={overview?.schoolDay} {...cardState} />}
        <AttentionCard rows={attentionRows} {...cardState} />
      </Row>

      <Row>
        {shows('attendance') && (
          <StudentAttendanceChartCard
            payload={attendance ? { monthly: attendance.monthly, todayAbsent: attendance.absentToday, todayLate: attendance.lateToday } : undefined}
            businessDate={overview?.date}
            className="min-h-[20rem]"
            {...cardState}
          />
        )}
        {shows('grades') && <GradesByClassChart rows={overview?.grades?.byClass} className="min-h-[20rem]" {...cardState} />}
        {shows('discipline') && (
          <IncidentsTrendChart monthly={discipline?.monthly} businessDate={overview?.date} className="min-h-[20rem]" {...cardState} />
        )}
      </Row>

      <Row>
        {shows('students') && (
          <StudentsGenderChartCard
            rows={overview?.students?.byGender.map((row) => ({
              ...row,
              name: t(row.gender === 'M' ? 'common.male' : 'common.female'),
            }))}
            className="min-h-[23rem]"
            {...cardState}
          />
        )}
        {shows('discipline') && <IncidentsCard incidents={discipline?.incidents} {...cardState} />}
        {actions.length > 0 && <QuickActionsCard actions={actions} />}
        <CalendarCard className="min-h-[23rem]" />
      </Row>
    </div>
  );
};

export default SupervisorOverview;
