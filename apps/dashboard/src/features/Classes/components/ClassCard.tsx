"use client";

import React from 'react';
import { GraduationCap, Calendar, Hash, FileText } from 'lucide-react';
import { NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { Label } from 'najm-kit';

const ClassCard = ({ data }: any) => {
  const { t } = useTranslation();
  const classData = data;

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center dark:bg-primary">
          <GraduationCap className="w-6 h-6 text-primary dark:text-white" />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <Label className="text-md font-bold">
          {classData.name}
        </Label>

        <div className="space-y-2">
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
              value={classData.level}
              valueColor="text-foreground font-medium"
            />
          )}

          {classData.description && (
            <NSectionInfo
              icon={FileText}
              iconColor="text-muted-foreground"
              label={t('classes.form.description')}
              value={classData.description}
              valueColor="text-muted-foreground"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassCard;
