'use client';

import React from 'react';
import { CalendarRange, Hash, Languages } from 'lucide-react';
import { Badge, Label, NSectionInfo } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';

const CycleCard = ({ data }: any) => {
  const { t, language } = useTranslation();
  const cycle = data;

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center dark:bg-primary">
          <CalendarRange className="w-6 h-6 text-primary dark:text-white" />
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-md font-bold">{cycle?.labels?.[language] || cycle.name}</Label>
          {!cycle.active && <Badge className="bg-slate-200 text-xs text-slate-700">{t('status.inactive')}</Badge>}
        </div>
        <div className="space-y-2">
          <NSectionInfo icon={Hash} iconColor="text-muted-foreground" label={t('cycles.form.sortOrder')} value={cycle.sortOrder ?? 0} />
          {cycle.labels && (
            <NSectionInfo
              icon={Languages}
              iconColor="text-muted-foreground"
              label={t('cycles.form.labels')}
              value={Object.values(cycle.labels).filter(Boolean).join(' / ')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CycleCard;
