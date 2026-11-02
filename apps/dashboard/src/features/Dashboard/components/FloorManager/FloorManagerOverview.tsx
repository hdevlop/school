'use client';

import { CalendarDays, CalendarX2, Bell, ClipboardCheck, Layers3, ShieldAlert, Star, UserX, UsersRound } from 'lucide-react';
import { NButton, NErrorState, NForbiddenState } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { isAuthorizationError } from '@/services/apiError';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useFloorManagerOverview } from '../../hooks/useFloorManagerDashboard';
import { FLOOR_MANAGER_DASHBOARD_LINKS } from '../../config/floorManagerDashboardLinks';
import TeacherInfoCard from '../Teacher/TeacherInfoCard';
import { AttentionCard, type AttentionRow } from '../Teacher/NeedsAttentionCard';
import QuickActionsCard, { type QuickAction } from '../Teacher/QuickActionsCard';
import FloorManagerKpis from './FloorManagerKpis';
import RegistersCard from './RegistersCard';
import AbsencesCard from './AbsencesCard';
import IncidentsCard from './IncidentsCard';

// The teacher overview's rows of three cards (the `fit` variant in globals.css).
const ROW = 'grid grid-cols-1 gap-3 lg:grid-cols-3 fit:min-h-[17rem] fit:flex-1 fit:basis-0 [&>*]:min-w-0 fit:[&>*]:min-h-0';

const action = (key: string, icon: QuickAction['icon'], href: string): QuickAction => ({
  key,
  label: `dashboard.floorManager.quickActions.${key}`,
  hint: `dashboard.floorManager.quickActions.${key}Hint`,
  icon,
  href,
});

// A floor manager's everyday tasks. Every destination is a route their
// sidebar already offers.
const ACTIONS: QuickAction[] = [
  action('takeAttendance', ClipboardCheck, FLOOR_MANAGER_DASHBOARD_LINKS.attendance),
  action('reportIncident', ShieldAlert, FLOOR_MANAGER_DASHBOARD_LINKS.discipline),
  action('recordReward', Star, FLOOR_MANAGER_DASHBOARD_LINKS.behaviorRewards),
  action('viewTimetable', CalendarDays, FLOOR_MANAGER_DASHBOARD_LINKS.timetable),
  action('viewStudents', UsersRound, FLOOR_MANAGER_DASHBOARD_LINKS.students),
];

/** The school's business date the overview describes, for a page header. */
export const FloorManagerOverviewDate = () => {
  const { displayDate } = useSchoolFormat();
  const { data: overview } = useFloorManagerOverview();
  if (!overview) return null;
  return (
    <NButton type="button" variant="outline" size="sm" className="gap-2 max-md:hidden">
      <CalendarDays className="size-4" />
      {displayDate(overview.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    </NButton>
  );
};

const FloorManagerOverview = () => {
  const { t } = useTranslation();
  const { data: overview, isLoading, error, refetch } = useFloorManagerOverview();
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
    { key: 'missingRegisters', label: t('dashboard.floorManager.attention.missingRegisters'), icon: CalendarX2, dot: 'bg-rose-500', href: FLOOR_MANAGER_DASHBOARD_LINKS.attendance, count: attention?.missingRegisters },
    { key: 'absentToday', label: t('dashboard.floorManager.attention.absentToday'), icon: UserX, dot: 'bg-amber-500', href: FLOOR_MANAGER_DASHBOARD_LINKS.attendance, count: attention?.absentToday },
    { key: 'openIncidents', label: t('dashboard.floorManager.attention.openIncidents'), icon: ShieldAlert, dot: 'bg-violet-500', href: FLOOR_MANAGER_DASHBOARD_LINKS.discipline, count: attention?.openIncidents },
    { key: 'unreadNotifications', label: t('dashboard.teacher.attention.notifications'), icon: Bell, dot: 'bg-sky-500', href: FLOOR_MANAGER_DASHBOARD_LINKS.notifications, count: attention?.unreadNotifications },
  ];
  const grades = overview?.manager.grades ?? [];

  return (
    <div className="flex min-h-full flex-col gap-3 pb-1 fit:h-full">
      <FloorManagerKpis kpis={overview?.kpis} loading={isLoading} />

      <div className={ROW}>
        <TeacherInfoCard
          person={overview?.manager}
          subtitle={(
            <p className="flex max-w-full items-center gap-1.5 text-sm text-muted-foreground">
              <Layers3 className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {grades.length
                  ? t('dashboard.floorManager.info.grades', { grades: grades.join(', ') })
                  : t('dashboard.floorManager.info.noGrades')}
              </span>
            </p>
          )}
          {...cardState}
        />
        <RegistersCard sections={overview?.sections} {...cardState} />
        <AttentionCard rows={attentionRows} {...cardState} />
      </div>

      <div className={ROW}>
        <AbsencesCard absences={overview?.absences} schoolDay={overview?.schoolDay} {...cardState} />
        <IncidentsCard incidents={overview?.incidents} {...cardState} />
        <QuickActionsCard actions={ACTIONS} />
      </div>
    </div>
  );
};

export default FloorManagerOverview;
