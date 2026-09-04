'use client'

import { NPageHeader, NPageHeaderActions } from 'najm-kit';
import { LayoutDashboard } from 'lucide-react';
import FinanceKpis from './components/FinanceKpis';
import StudentsGenderChart from './components/StudentsGenderChart';
import IncomeExpensesTrend from './components/IncomeExpensesTrend';
import CalendarCard from './components/CalendarCard';
import StudentAttendanceChart from './components/StudentAttendanceChart';
import TeachersAttendance from './components/TeachersAttendance';
import ExpenseBreakdownChart from '@/features/Reports/components/ExpenseBreakdownChart';
import OverdueFees from './components/OverdueFees';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';

const Dashboard = () => {
  const { t } = useTranslation();

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

      <FinanceKpis />

      <div className='grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 min-h-0 [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:overflow-hidden'>
        <StudentsGenderChart className="md:col-span-2" />
        <StudentAttendanceChart className="md:col-span-4" />
        <IncomeExpensesTrend className="md:col-span-6" />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 min-h-0 [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:overflow-hidden'>
        <ExpenseBreakdownChart className="md:col-span-2" />
        <TeachersAttendance className="md:col-span-4" />
        <OverdueFees className="md:col-span-4" />
        <CalendarCard className="md:col-span-2" />
      </div>
    </div>
  );
};

export default Dashboard;
