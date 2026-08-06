import React from 'react';
import { Clock, User, Calendar } from 'lucide-react';
import { NCard } from 'najm-kit';
import { cn } from '@/lib/utils';
import { NSkeletonEventList } from 'najm-kit';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { useTranslation } from '@/hooks/useLanguage';

interface LastEventsProps {
   className?: string;
}

const MONTH_KEYS = ['january', 'february', 'march', 'april', 'may', 'june',
   'july', 'august', 'september', 'october', 'november', 'december'];


const LastEvents: React.FC<LastEventsProps> = ({ className }) => {
   const { t } = useTranslation();
   const isLoading = useDelayedLoading();

   const events = [
      { id: 1, date: '2025-10-15', title: 'Math 101 - Midterm Exam', time: '10:00 AM', class: 'CM1 A', color: 'bg-blue-500' },
      { id: 2, date: '2025-10-17', title: 'Project Submission', time: '11:59 PM', class: 'CM2 B', color: 'bg-purple-500' },
      { id: 3, date: '2025-10-20', title: 'Parent Meeting', time: '2:00 PM', class: 'CM1 C', color: 'bg-green-500' },
      { id: 4, date: '2025-10-22', title: 'Science Lab', time: '9:00 AM', class: 'CM3 A', color: 'bg-orange-500' },
   ];

   const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const monthKey = MONTH_KEYS[date.getMonth()];
      const shortKey = monthKey.substring(0, 3);
      const day = date.getDate();
      return { month: t(`common.monthsLong.${shortKey}`), day };
   };

   return (
      <NCard
         title={t('dashboard.lastEvents.title')}
         icon={Calendar}
         className={cn('flex gap-auto', className)}
         loading={isLoading}
         skeleton={<NSkeletonEventList />}
      >
         <div className='flex flex-col justify-between h-full'>

            {events.map(event => {
               const { month, day } = formatDate(event.date);
               return (
                  <div key={event.id} className="flex gap-2 p-2 rounded-lg ">
                     <div className="flex flex-col items-center justify-center min-w-[50px]">
                        <div className={`${event.color} text-white px-2  rounded-t text-xs font-medium w-full text-center`}>
                           {month}
                        </div>
                        <div className="border-2 border-t-0 px-2  rounded-b text-lg font-bold text-foreground w-full text-center">
                           {day}
                        </div>
                     </div>

                     <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm mb-1 truncate">{event.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                           <div className="flex items-center gap-1">
                              <Clock size={12} />
                              <span>{event.time}</span>
                           </div>
                           <div className="flex items-center gap-1">
                              <User size={12} />
                              <span>{event.class}</span>
                           </div>
                        </div>
                     </div>
                  </div>
               );
            })}

         </div>

      </NCard>
   );
};

export default LastEvents;
