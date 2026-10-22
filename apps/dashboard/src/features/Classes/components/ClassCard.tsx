"use client";

import React from 'react';
import { GraduationCap, Calendar, Hash, FileText, Layers } from 'lucide-react';
import { NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { Label } from 'najm-kit';
import { useCycles } from '@/features/Cycles/hooks/useCycles';
import { academicLevelLabel } from '@sms/contracts';

const ClassCard = ({ data }: any) => {
  const { t, language } = useTranslation();
  const { cycles } = useCycles();
  const classData = data;
  const cycle = cycles?.find(cycle => cycle.id === classData.cycleId);

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center dark:bg-primary">
          <GraduationCap className="w-6 h-6 text-primary dark:text-white" />
        </div>
      </div>

      <div className="min-w-0 flex-1 flex flex-col gap-2">
        <Label className="text-md font-bold">
          {classData.name}
        </Label>

        <div className="space-y-2">
          <NSectionInfo
            icon={Layers}
            label={t('classes.form.cycle')}
            maxChars={Number.MAX_SAFE_INTEGER}
            className="flex-wrap"
            value={cycle?.labels?.[language] || cycle?.name || t('common.notAssigned')}
          />
          <NSectionInfo
            icon={Calendar}
            iconColor="text-primary"
            label={t('classes.form.academicYear')}
            value={classData.academicYear}
            valueColor="text-primary"
          />

          {classData.level && (
            <NSectionInfo
              icon={Hash}
              iconColor="text-muted-foreground"
              label={t('classes.form.level')}
              value={academicLevelLabel(classData.level, language)}
              maxChars={Number.MAX_SAFE_INTEGER}
              valueColor="text-foreground font-medium"
            />
          )}

          {classData.description && (
            <NSectionInfo
              icon={FileText}
              iconColor="text-muted-foreground"
              label={t('classes.form.description')}
              value={<span className="whitespace-pre-wrap break-words">{classData.description}</span>}
              className="flex-wrap items-start [&>svg]:shrink-0"
              valueColor="text-muted-foreground"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassCard;
