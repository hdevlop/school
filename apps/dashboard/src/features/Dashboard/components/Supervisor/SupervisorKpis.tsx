'use client';

import { CalendarCheck, Clock, DoorOpen, ShieldAlert, UserX, UsersRound, type LucideIcon } from 'lucide-react';
import { NStatCard, NStatCardSkeleton, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { SupervisorDashboardOverview } from '@sms/contracts/supervisor-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

type Kpi = { key: string; icon: LucideIcon; label: string; value: string; alert?: boolean };

const COLUMNS: Record<number, string> = {
  1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6',
};

// The supervisor's summary figures. A figure whose permission the supervisor
// lacks is not sent, so its tile is left out rather than shown as 0.
const SupervisorKpis = ({ overview, loading }: { overview: SupervisorDashboardOverview | undefined; loading: boolean }) => {
  const { t } = useTranslation();
  const { number, percent } = useSchoolFormat();
  const { attendance, students, discipline, visitRequests } = overview ?? {};

  const kpis: Kpi[] = loading ? [] : [
    ...(students ? [{ key: 'students', icon: UsersRound, label: t('dashboard.floorManager.kpis.totalStudents'), value: number(students.total) }] : []),
    ...(attendance ? [
      { key: 'absent', icon: UserX, label: t('dashboard.floorManager.kpis.absentToday'), value: number(attendance.absentToday), alert: attendance.absentToday > 0 },
      { key: 'late', icon: Clock, label: t('dashboard.floorManager.kpis.lateToday'), value: number(attendance.lateToday) },
      {
        key: 'rate',
        icon: CalendarCheck,
        label: t('dashboard.teacher.kpis.attendanceRate'),
        value: percent(attendance.attendanceRate == null ? null : attendance.attendanceRate / 100, 0),
      },
    ] : []),
    ...(discipline ? [{ key: 'incidents', icon: ShieldAlert, label: t('dashboard.floorManager.attention.openIncidents'), value: number(discipline.openIncidents), alert: discipline.openIncidents > 0 }] : []),
    ...(visitRequests ? [{ key: 'visits', icon: DoorOpen, label: t('dashboard.supervisor.kpis.newVisitRequests'), value: number(visitRequests.newRequests), alert: visitRequests.newRequests > 0 }] : []),
  ];

  if (loading) {
    return (
      <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6 lg:gap-3">
        {Array.from({ length: 6 }, (_, index) => <NStatCardSkeleton key={index} />)}
      </div>
    );
  }
  if (!kpis.length) return null;

  return (
    <div className={cn('grid shrink-0 grid-cols-2 gap-2 md:grid-cols-3 lg:gap-3', COLUMNS[kpis.length])}>
      {kpis.map(({ key, icon, label, value, alert }) => (
        <NStatCard key={key} icon={icon} label={label} value={value} classNames={{ value: alert ? 'text-destructive' : undefined }} />
      ))}
    </div>
  );
};

export default SupervisorKpis;
