'use client';

import { BarChart3, Bell, ClipboardList, GraduationCap, UsersRound } from 'lucide-react';
import { NStatCard } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { TeacherDashboardOverview } from '@sms/contracts/teacher-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

type TeacherKpisProps = {
  kpis: TeacherDashboardOverview['kpis'] | undefined;
  loading: boolean;
};

// Phones keep the three figures that change through the day; the totals
// join them from the large breakpoint.
const TeacherKpis = ({ kpis, loading }: TeacherKpisProps) => {
  const { t } = useTranslation();
  const { number, percent } = useSchoolFormat();
  const alertValue = (value: number | undefined) => (value ? 'text-destructive' : undefined);

  return (
    <div className="grid grid-cols-3 gap-2 lg:grid-cols-5 lg:gap-3">
      <NStatCard
        className="hidden lg:flex"
        loading={loading}
        icon={UsersRound}
        label={t('dashboard.teacher.kpis.totalStudents')}
        value={number(kpis?.totalStudents ?? 0)}
      />
      <NStatCard
        loading={loading}
        icon={GraduationCap}
        label={t('dashboard.teacher.kpis.classesToday')}
        value={number(kpis?.classesToday ?? 0)}
      />
      <NStatCard
        loading={loading}
        icon={ClipboardList}
        label={t('dashboard.teacher.kpis.pendingTasks')}
        value={number(kpis?.pendingTasks ?? 0)}
        classNames={{ value: alertValue(kpis?.pendingTasks) }}
      />
      <NStatCard
        loading={loading}
        icon={BarChart3}
        label={t('dashboard.teacher.kpis.attendance')}
        value={percent(kpis?.attendanceRate == null ? null : kpis.attendanceRate / 100, 0)}
        subtext={t('dashboard.teacher.trend.range7d')}
      />
      <NStatCard
        className="hidden lg:flex"
        loading={loading}
        icon={Bell}
        label={t('dashboard.teacher.kpis.notifications')}
        value={number(kpis?.unreadNotifications ?? 0)}
        classNames={{ value: alertValue(kpis?.unreadNotifications) }}
      />
    </div>
  );
};

export default TeacherKpis;
