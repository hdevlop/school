"use client";

import React from 'react';
import { BookOpen, Hash, FileText } from 'lucide-react';
import { NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { Label } from 'najm-kit';

const SubjectCard = ({ data }: any) => {
  const { t } = useTranslation();
  const subject = data;

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center dark:bg-primary">
          <BookOpen className="w-6 h-6 text-primary dark:text-white" />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <Label className="text-md font-bold">
          {subject.name}
        </Label>

        <div className="space-y-2">
          <NSectionInfo
            icon={Hash}
            iconColor="text-primary"
            label={t('subjects.form.code')}
            value={subject.code}
            valueColor="text-primary font-semibold uppercase"
          />

          {subject.description && (
            <NSectionInfo
              icon={FileText}
              iconColor="text-muted-foreground"
              label={t('subjects.form.description')}
              value={subject.description}
              valueColor="text-muted-foreground"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectCard;
