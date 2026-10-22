"use client";

import React from 'react';
import { BookOpen, Hash, FileText } from 'lucide-react';
import { NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { Label } from 'najm-kit';

const SubjectCard = ({ data, details = false }: any) => {
  const { t } = useTranslation();
  const subject = data;

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center dark:bg-primary">
          <BookOpen className="w-6 h-6 text-primary dark:text-white" />
        </div>
      </div>

      <div className="min-w-0 flex-1 flex flex-col gap-2">
        <Label className="text-md font-bold">
          {subject.name}
        </Label>

        <div className="space-y-2">
          <NSectionInfo
            icon={Hash}
            iconColor="text-primary"
            label={t('subjects.form.code')}
            value={subject.code}
            maxChars={details ? Infinity : 12}
            valueColor="text-primary font-semibold uppercase"
          />

          {subject.description && (
            <NSectionInfo
              icon={FileText}
              iconColor="text-muted-foreground"
              label={t('subjects.form.description')}
              value={subject.description}
              maxChars={details ? Infinity : 12}
              valueColor="text-muted-foreground min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]"
              className={details ? 'flex-wrap items-start [&>svg]:shrink-0' : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectCard;
