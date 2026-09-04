'use client'

import React from 'react';
import { useDashboardWidgets } from '@/features/Dashboard/hooks/useDashboardHooks';
import { useTranslation } from 'najm-i18n/react';
import { NSkeletonWidgets, NStatCard } from 'najm-kit';

const iconMap = {
  studentImage: 'graduation-cap',
  teacherImage: 'users',
  parentsImage: 'user-round',
  feesImage: 'wallet',
  expensesImage: 'trending-down',
};

const Widgets = () => {
  const { data, isLoading } = useDashboardWidgets();
  const { t } = useTranslation();

  if (isLoading) return <NSkeletonWidgets />;

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3'>
      {data?.map((widget, index) => (
        <NStatCard
          key={index}
          icon={iconMap[widget.icon as keyof typeof iconMap] ?? 'bar-chart-3'}
          label={t(widget.title)}
          value={widget.value ?? 0}
        />
      ))}
    </div>
  );
};

export default Widgets;
