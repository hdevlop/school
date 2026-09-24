'use client';

import React from 'react';
import { FileBarChart } from 'lucide-react';
import { NPageHeader, NPageHeaderActions } from 'najm-kit';
import IncomeExpensesTrend from '@/features/Dashboard/components/IncomeExpensesTrend';
import ExpenseBreakdownChart from './components/ExpenseBreakdownChart';
import CollectionByClassChart from './components/CollectionByClassChart';
import { useActiveAcademicYear } from '@/features/Settings/hooks/useSettings';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';

const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const { academicYear: year } = useActiveAcademicYear();

  return (
    <div className="flex flex-col gap-2 h-full overflow-auto pb-4">
      <NPageHeader
        icon={FileBarChart}
        title={t('reports.title')}
        subtitle={t('reports.year', { year })}
      >
        <NPageHeaderActions>
          <PageHeaderGlobalActions />
        </NPageHeaderActions>
      </NPageHeader>

      {/* Row 1: Income vs Expenses trend (full width) */}
      <div className="h-[320px]">
        <IncomeExpensesTrend academicYear={year} />
      </div>

      {/* Row 2: Expense breakdown + Collection by class */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="min-h-[460px]">
          <ExpenseBreakdownChart academicYear={year} />
        </div>
        <div className="min-h-[460px]">
          <CollectionByClassChart academicYear={year} />
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
