'use client';

import { Bell, CalendarCheck, Clock, Layers3, UserX, UsersRound } from 'lucide-react';
import { NStatCard } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { FloorManagerDashboardOverview } from '@sms/contracts/floor-manager-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

type FloorManagerKpisProps = {
  kpis: FloorManagerDashboardOverview['kpis'] | undefined;
  loading: boolean;
};

// The floor manager's six summary figures across their assigned grades.
const FloorManagerKpis = ({ kpis, loading }: FloorManagerKpisProps) => {
  const { t } = useTranslation();
  const { number, percent } = useSchoolFormat();
  const alertValue = (value: number | undefined) => (value ? 'text-destructive' : undefined);

  return (
    <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6 lg:gap-3">
      <NStatCard
        loading={loading}
        icon={UsersRound}
        label={t('dashboard.floorManager.kpis.totalStudents')}
        value={number(kpis?.totalStudents ?? 0)}
      />
      <NStatCard
        loading={loading}
        icon={Layers3}
        label={t('dashboard.floorManager.kpis.sections')}
        value={number(kpis?.sections ?? 0)}
      />
      <NStatCard
        loading={loading}
        icon={UserX}
        label={t('dashboard.floorManager.kpis.absentToday')}
        value={number(kpis?.absentToday ?? 0)}
        classNames={{ value: alertValue(kpis?.absentToday) }}
      />
      <NStatCard
        loading={loading}
        icon={Clock}
        label={t('dashboard.floorManager.kpis.lateToday')}
        value={number(kpis?.lateToday ?? 0)}
      />
      <NStatCard
        loading={loading}
        icon={CalendarCheck}
        label={t('dashboard.teacher.kpis.attendanceRate')}
        value={percent(kpis?.attendanceRate == null ? null : kpis.attendanceRate / 100, 0)}
      />
      <NStatCard
        loading={loading}
        icon={Bell}
        label={t('dashboard.teacher.kpis.notifications')}
        value={number(kpis?.unreadNotifications ?? 0)}
        classNames={{ value: alertValue(kpis?.unreadNotifications) }}
      />
    </div>
  );
};

export default FloorManagerKpis;
