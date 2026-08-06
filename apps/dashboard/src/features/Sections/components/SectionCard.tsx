"use client";

import React from 'react';
import { Building, DoorOpen, Users, GraduationCap } from 'lucide-react';
import { NSectionInfo } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';
import { Label } from 'najm-kit';

const SectionCard = ({ data }: any) => {
  const { t } = useTranslation();
  const section = data;

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center dark:bg-primary">
          <Building className="w-6 h-6 text-primary dark:text-white" />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <Label className="text-md font-bold">
          {section.name}
        </Label>

        <div className="space-y-2">
          {section.class && (
            <NSectionInfo
              icon={GraduationCap}
              iconColor="text-primary"
              label={t('sections.form.class')}
              value={section.class.name}
              valueColor="text-primary"
            />
          )}

          {section.roomNumber && (
            <NSectionInfo
              icon={DoorOpen}
              iconColor="text-muted-foreground"
              label={t('sections.form.roomNumber')}
              value={section.roomNumber}
              valueColor="text-foreground font-medium"
            />
          )}

          <NSectionInfo
            icon={Users}
            iconColor="text-muted-foreground"
            label={t('sections.form.maxStudents')}
            value={section.maxStudents || 30}
            valueColor="text-foreground font-medium"
          />
        </div>
      </div>
    </div>
  );
};

export default SectionCard;
