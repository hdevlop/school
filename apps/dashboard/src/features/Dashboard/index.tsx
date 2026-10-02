'use client'

import { NPageHeader, NPageHeaderActions } from 'najm-kit';
import { LayoutDashboard } from 'lucide-react';
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
import { canReadFinanceDashboard, usesTeacherDashboard } from './config/dashboardAudience';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';

const Dashboard = () => {
  const { user } = useAuth();
  const role = (user as { role?: string } | null)?.role;
  return usesTeacherDashboard(role) ? <TeacherDashboard /> : <SchoolDashboard role={role} />;
};

const SchoolDashboard = ({ role }: { role: string | undefined }) => {
  const { t } = useTranslation();
  // Finance widgets are for the roles the finance dashboard admits; for
  // everyone else the school charts widen to fill their rows.
  const showFinance = canReadFinanceDashboard(role);

  return (
    <div className='flex flex-col w-full h-full min-h-0 gap-2'>
      <NPageHeader
        icon={LayoutDashboard}
        title={t('navigation.dashboard')}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      {showFinance && <FinanceKpis />}

      <div className='grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 min-h-0 [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:overflow-hidden'>
        <StudentsGenderChart className={showFinance ? 'md:col-span-2' : 'md:col-span-4'} />
        <StudentAttendanceChart className={showFinance ? 'md:col-span-4' : 'md:col-span-8'} />
        {showFinance && <IncomeExpensesTrend className="md:col-span-6" />}
      </div>

      <div className='grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 min-h-0 [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:overflow-hidden'>
        {showFinance && <ExpenseBreakdownChart className="md:col-span-2" />}
        <TeachersAttendance className={showFinance ? 'md:col-span-4' : 'md:col-span-8'} />
        {showFinance && <OverdueFees className="md:col-span-4" />}
        <CalendarCard className={showFinance ? 'md:col-span-2' : 'md:col-span-4'} />
      </div>
    </div>
  );
};

export default Dashboard;
