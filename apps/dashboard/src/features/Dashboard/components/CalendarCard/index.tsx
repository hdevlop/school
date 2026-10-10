'use client';
import { format } from 'date-fns';
import { ar, enUS, es, fr } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import { NCard } from 'najm-kit';
import { Calendar } from 'najm-kit';
import { CalendarIcon } from 'lucide-react';
import { buttonVariants, cn } from 'najm-kit';
import { NSkeletonCalendar } from 'najm-kit';
import { useDelayedLoading } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

// The kit places each arrow with `absolute left-1/right-1`, but day-picker v9
// renders the nav beside the months, not inside the caption, so the arrows
// anchor to the page. Here the nav is one row over the caption, and the grid
// shares the card's width in seven equal columns instead of fixed 32px cells.
// Keys left out (outside, disabled, hidden) keep the kit's classes.
const navButton = cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-7 bg-transparent p-0 text-muted-foreground hover:text-foreground');

const calendarClassNames = {
  months: 'relative flex flex-col gap-4',
  month_caption: 'flex h-8 items-center justify-center px-7',
  caption_label: 'truncate text-sm font-medium',
  nav: 'pointer-events-none absolute inset-x-0 top-0 flex h-8 items-center justify-between [&>button]:pointer-events-auto',
  button_previous: navButton,
  button_next: navButton,
  month_grid: 'w-full border-collapse',
  weekdays: 'flex',
  weekday: 'flex-1 truncate text-center text-[0.8rem] font-normal text-muted-foreground',
  week: 'mt-2 flex w-full',
  day: 'relative flex flex-1 justify-center p-0 text-center text-sm focus-within:z-20',
  day_button: 'aspect-square w-full max-w-9 cursor-pointer rounded-md p-0 font-normal hover:bg-accent disabled:cursor-not-allowed',
  // Day-picker marks the cell; the highlight belongs on the square button inside it.
  selected: '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary',
  today: '[&:not([data-selected])>button]:bg-accent [&:not([data-selected])>button]:text-accent-foreground',
};

const CalendarCard = ({ className = '' }) => {
  const { t, language } = useTranslation();
  const calendarLocale = { ar, en: enUS, es, fr }[language] ?? enUS;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const isLoading = useDelayedLoading();

  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  return (
    <NCard title={t('dashboard.calendar.title')} icon={CalendarIcon} className={cn('flex w-full h-full', className)} loading={isLoading} skeleton={<NSkeletonCalendar />}>
      <Calendar
        mode="single"
        locale={calendarLocale}
        selected={selectedDate}
        onSelect={setSelectedDate}
        classNames={calendarClassNames}
        // Two-letter weekdays fit the narrowest dashboard column; "lun." does not.
        formatters={{ formatWeekdayName: (weekday) => format(weekday, 'EEEEEE', { locale: calendarLocale }) }}
        className="mx-auto w-full max-w-sm rounded-md p-1"
      />
    </NCard>
  );
};

export default CalendarCard;
