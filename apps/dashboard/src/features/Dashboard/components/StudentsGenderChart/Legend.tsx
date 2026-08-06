import React from 'react';
import { getGenderColor } from './genderColors';
import { useTranslation } from '@/hooks/useLanguage';

interface LegendProps {
   data: Array<{ gender?: string; name: string; value: number }>;
}

export const Legend: React.FC<LegendProps> = ({ data }) => {
   const { t } = useTranslation();
   const total = data.reduce((s, d) => s + d.value, 0);

   return (
      <div className="flex flex-col gap-1.5 w-full">
         {data.map((item, index) => {
            const color = getGenderColor(item.gender ?? item.name);
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
            // Backend already returns a translated `name`, so display it directly.
            const label = item.name;
            return (
               <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                     <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                     <span className="text-muted-foreground">{label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                     <span className="font-bold" style={{ color }}>{item.value}</span>
                     <span className="text-muted-foreground">({pct}%)</span>
                  </div>
               </div>
            );
         })}
         <div className="flex items-center justify-between text-xs border-t pt-1 mt-0.5">
            <span className="font-medium text-muted-foreground">{t('common.total')}</span>
            <span className="font-bold">{total}</span>
         </div>
      </div>
   );
};
