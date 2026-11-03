'use client';

import { CalendarCheck, ClipboardCheck, GraduationCap, ShieldAlert, UserRound, UsersRound } from 'lucide-react';
import { NErrorState, NStatCard, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { SecretaryDashboardOverview } from '@sms/contracts/secretary-dashboard';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useBusinessDate } from '@/features/Settings/hooks/useSettings';
import { useStaffAttendanceMonthly, useStudentAttendanceMonthly } from '../../hooks/useDashboardHooks';

const COLUMNS: Record<number, string> = {
  1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6',
};

export default function SecretaryKpis({ overview, loading }: { overview: SecretaryDashboardOverview | undefined; loading: boolean }) {
  const { t } = useTranslation();
  const { number, percent } = useSchoolFormat();
  const { can } = useViewerRole();
  const { businessDate, isBusinessDateLoading } = useBusinessDate();
  // Share the secretary chart's year-scoped query rather than fetch attendance again.
  const staffAttendance = useStaffAttendanceMonthly('secretary');
  const studentAttendance = useStudentAttendanceMonthly('secretary');
  const attendanceCards = [
    { key: 'studentAttendance', label: 'dashboard.secretary.kpis.monthlyStudentAttendance', icon: ClipboardCheck, query: studentAttendance, rate: false },
    { key: 'staffAttendance', label: 'dashboard.secretary.kpis.monthlyAttendance', icon: CalendarCheck, query: staffAttendance, rate: true },
  ];
  const cards = [
    ...(can('read:students') ? [{ key: 'students', icon: UsersRound, label: 'dashboard.secretary.kpis.students', value: overview?.students }] : []),
    { key: 'teachers', icon: GraduationCap, label: 'dashboard.widgets.totalTeachers', value: overview?.teachers },
    { key: 'parents', icon: UserRound, label: 'dashboard.secretary.kpis.parents', value: overview?.parents },
    {
      key: 'incidents', icon: ShieldAlert, label: 'dashboard.secretary.kpis.incidents',
      value: overview?.incidentsMonthly.reduce((total, month) => total + month.low + month.medium + month.high + month.critical, 0),
    },
  ];

  return (
    <div className={cn('grid shrink-0 grid-cols-2 gap-2 lg:gap-3', COLUMNS[cards.length + attendanceCards.length])}>
      {cards.map(({ key, icon, label, value }) => (
        <NStatCard key={key} icon={icon} label={t(label)} value={number(value ?? 0)} loading={loading} />
      ))}
      {attendanceCards.map(({ key, label, icon, query, rate }) => {
        const month = query.data?.monthly?.find((row: { month: string }) => row.month === businessDate.slice(0, 7));
        const attended = Number(month?.present ?? 0) + Number(month?.late ?? 0);
        const totalMarks = Number(month?.total ?? 0);
        const value = rate
          ? percent(totalMarks > 0 ? attended / totalMarks : null, 0)
          : number(month ? attended : null);
        return !query.data && query.error ? (
          <NErrorState key={key} surface="panel" title={t('common.feedback.errorTitle')} onRetry={() => { void query.refetch(); }} />
        ) : (
          <NStatCard key={key} icon={icon} label={t(label)} value={value} loading={loading || query.isLoading || isBusinessDateLoading} />
        );
      })}
    </div>
  );
}
