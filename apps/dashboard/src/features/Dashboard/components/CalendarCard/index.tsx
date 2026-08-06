'use client';
import React, { useEffect, useState } from 'react';
import { NCard } from 'najm-kit';
import { Calendar } from 'najm-kit';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NSkeletonCalendar } from 'najm-kit';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { useTranslation } from '@/hooks/useLanguage';

const CalendarCard = ({ className = '' }) => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const isLoading = useDelayedLoading();

  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  return (
    <NCard title={t('dashboard.calendar.title')} icon={CalendarIcon} className={cn('flex w-full h-full', className)} loading={isLoading} skeleton={<NSkeletonCalendar />}>
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        className="rounded-md mx-auto w-full [--cell-size:2.25rem]"
      />
    </NCard>
  );
};

export default CalendarCard;
