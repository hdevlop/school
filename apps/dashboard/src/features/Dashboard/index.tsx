'use client'

import { FEATURE_ICONS } from '@/shared/featureIcons';

import { NPageHeaderActions, cn } from 'najm-kit';
import { SchoolPageHeader as NPageHeader } from '@/components/SchoolPageHeader';

import { useAuth } from 'najm-auth/client/react';
import FinanceKpis from './components/FinanceKpis';
import StudentsGenderChart from './components/StudentsGenderChart';
import IncomeExpensesTrend from './components/IncomeExpensesTrend';
import CalendarCard from './components/CalendarCard';
import StudentAttendanceChart from './components/StudentAttendanceChart';
import TeachersAttendance from './components/TeachersAttendance';
import ExpenseBreakdownChart from '@/features/Reports/components/ExpenseBreakdownChart';
import OverdueFees from './components/OverdueFees';
import TeacherDashboard from './components/Teacher';
import MonitorDashboard from './components/Monitor';
import SupervisorDashboard from './components/Supervisor';
import SecretaryDashboard from './components/Secretary';
import RegistrarDashboard from './components/Registrar';
import {
  canReadFinanceDashboard, rowSpans, schoolDashboardCards,
  usesMonitorDashboard, usesRegistrarDashboard, usesSecretaryDashboard, usesSupervisorDashboard, usesTeacherDashboard,
} from './config/dashboardAudience';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';

const Dashboard = () => {
  const { user } = useAuth();
  const role = (user as { role?: string } | null)?.role;
  if (usesTeacherDashboard(role)) return <TeacherDashboard />;
  if (usesMonitorDashboard(role)) return <MonitorDashboard />;
  if (usesSupervisorDashboard(role)) return <SupervisorDashboard />;
  if (usesSecretaryDashboard(role)) return <SecretaryDashboard />;
  if (usesRegistrarDashboard(role)) return <RegistrarDashboard />;
  return <SchoolDashboard role={role} />;
};

const SchoolDashboard = ({ role }: { role: string | undefined }) => {
  const { t } = useTranslation();
  const viewer = useViewerRole();
  // Finance widgets are for the roles the finance dashboard admits, and each
  // school chart for the permission its route asks for; the cards shown
  // widen to fill their rows.
  const showFinance = canReadFinanceDashboard(role);
  const cards = schoolDashboardCards(viewer);
  const top = rowSpans({ gender: cards.studentsByGender && 2, attendance: cards.studentAttendance && 4, trend: showFinance && 6 });
  const bottom = rowSpans({ expenses: showFinance && 2, staff: cards.staffAttendance && 4, overdue: showFinance && 4, calendar: 2 });

  return (
    <div className='flex flex-col w-full h-full min-h-0 gap-2 max-md:overflow-y-auto'>
      <NPageHeader
        icon={FEATURE_ICONS.dashboard}
        title={t('navigation.dashboard')}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      {showFinance && <FinanceKpis />}

      {(top.gender || top.attendance || top.trend) && (
        <div className='grid grid-cols-1 md:grid-cols-12 gap-3 md:flex-1 md:min-h-0 max-md:shrink-0 max-md:auto-rows-[320px] [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:overflow-hidden'>
          {top.gender && <StudentsGenderChart className={top.gender} />}
          {top.attendance && <StudentAttendanceChart className={top.attendance} />}
          {top.trend && <IncomeExpensesTrend className={top.trend} />}
        </div>
      )}

      <div className='grid grid-cols-1 md:grid-cols-12 gap-3 md:flex-1 md:min-h-0 max-md:shrink-0 max-md:*:h-[320px] [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:overflow-hidden'>
        {bottom.expenses && <ExpenseBreakdownChart className={bottom.expenses} />}
        {bottom.staff && <TeachersAttendance className={bottom.staff} />}
        {bottom.overdue && <OverdueFees className={bottom.overdue} />}
        {/* Every other card is 320px on a phone; a month needs more, so the calendar takes its own height. */}
        <CalendarCard className={cn('max-md:h-auto!', bottom.calendar)} />
      </div>
    </div>
  );
};

export default Dashboard;
