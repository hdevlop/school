'use client';

import React, { useState } from 'react';
import { FileBarChart } from 'lucide-react';
import { NPageHeader, NPageHeaderActions } from 'najm-kit';
import IncomeExpensesTrend from '@/features/Dashboard/components/IncomeExpensesTrend';
import ExpenseBreakdownChart from './components/ExpenseBreakdownChart';
import CollectionByClassChart from './components/CollectionByClassChart';
import { getCurrentAcademicYear } from '@/lib/academicYear';
import { useTranslation } from 'najm-i18n/react';
import PageHeaderGlobalActions from '@/shared/PageHeaderGlobalActions';

const ACADEMIC_YEARS = (() => {
  const current = getCurrentAcademicYear();
  const [sy] = current.split('-').map(Number);
  return [current, `${sy - 1}-${sy}`, `${sy - 2}-${sy - 1}`];
})();

const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const [year, setYear] = useState(getCurrentAcademicYear());

  return (
    <div className="flex flex-col gap-2 h-full overflow-auto pb-4">
      <NPageHeader
        icon={FileBarChart}
        title={t('reports.title')}
        subtitle={t('reports.year', { year })}
      >
        <NPageHeaderActions>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="border border-border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {ACADEMIC_YEARS.map((y) => (
              <option key={y} value={y}>
                {t('reports.year', { year: y })}
              </option>
            ))}
          </select>
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
