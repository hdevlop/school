'use client';

import { NCard } from 'najm-kit';
import React from 'react';
import { DonutChart } from './Donut';
import { Legend } from './Legend';
import { useStudentsByGender } from '../../hooks/useDashboardHooks';
import { UsersIcon } from 'lucide-react';
import { cn } from 'najm-kit';
import { NSkeletonDonut } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import DashboardEmptyState from '../DashboardEmptyState';

const StudentsChart = ({className=''}) => {
   const { t } = useTranslation();
   const { data: studentData, isLoading, error, refetch } = useStudentsByGender();
   const rows = studentData || [];
   const noData = rows.length === 0 || rows.every((row: { value?: number }) => Number(row.value ?? 0) === 0);

   return (
       <NCard
          title={t('dashboard.students.title')}
         icon={UsersIcon}
          className={cn('flex flex-col h-full',className)}
         loading={isLoading}
         error={error}
         onRetry={() => refetch()}
         skeleton={<NSkeletonDonut />}
         classNames={{ content: 'flex-1 min-h-0' }}
      >
         {noData ? (
            <DashboardEmptyState icon={UsersIcon} title={t('common.feedback.emptyTitle')} />
         ) : (
            <div className="flex flex-col h-full gap-1 min-h-0">
               <DonutChart data={rows} />
               <Legend data={rows} />
            </div>
         )}
      </NCard>
   );
};

export default StudentsChart;
