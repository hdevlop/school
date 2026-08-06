'use client';

import { NCard } from 'najm-kit';
import React from 'react';
import { DonutChart } from './Donut';
import { Legend } from './Legend';
import { useStudentsByGender } from '../../hooks/useDashboardHooks';
import { UsersIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NSkeletonDonut } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';

const StudentsChart = ({className=''}) => {
   const { t } = useTranslation();
   const { data: studentData, isLoading, error, refetch } = useStudentsByGender();

   return (
       <NCard
          title={t('dashboard.students.title')}
         icon={UsersIcon}
          className={cn('flex flex-col h-full',className)}
         loading={isLoading}
         error={error}
         noData={!studentData || studentData.length === 0}
         onRetry={() => refetch()}
         skeleton={<NSkeletonDonut />}
      >
         <div className="flex flex-col h-full gap-1 min-h-0">
            <DonutChart data={studentData || []} />
            <Legend data={studentData || []} />
         </div>
      </NCard>
   );
};

export default StudentsChart;
