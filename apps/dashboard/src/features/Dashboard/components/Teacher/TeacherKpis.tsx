'use client';

import { Bell, CalendarCheck, ClipboardList, GraduationCap, Layers3, UsersRound } from 'lucide-react';
import { NStatCard } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { TeacherDashboardOverview } from '@sms/contracts/teacher-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

type TeacherKpisProps = {
  kpis: TeacherDashboardOverview['kpis'] | undefined;
  classes: TeacherDashboardOverview['classes'] | undefined;
  loading: boolean;
};

// Phones show two figures a row so labels stay whole.
const TeacherKpis = ({ kpis, classes, loading }: TeacherKpisProps) => {
  const { t } = useTranslation();
  const { number, percent } = useSchoolFormat();
  const assignedClasses = new Set((classes ?? []).map((item) => item.sectionId)).size;
  const alertValue = (value: number | undefined) => (value ? 'text-destructive' : undefined);

  return (
    <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6 lg:gap-3">
      <NStatCard
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
        icon={Bell}
        label={t('dashboard.teacher.kpis.notifications')}
        value={number(kpis?.unreadNotifications ?? 0)}
        classNames={{ value: alertValue(kpis?.unreadNotifications) }}
      />
      <NStatCard
        loading={loading}
        icon={CalendarCheck}
        label={t('dashboard.teacher.kpis.attendanceRate')}
        value={percent(kpis?.attendanceRate == null ? null : kpis.attendanceRate / 100, 0)}
      />
      <NStatCard
        loading={loading}
        icon={Layers3}
        label={t('dashboard.teacher.kpis.assignedClasses')}
        value={number(assignedClasses)}
      />
    </div>
  );
};

export default TeacherKpis;
