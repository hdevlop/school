"use client";

import React from 'react';
import { CalendarDays, User, BookOpen, School } from 'lucide-react';
import { NSectionInfo } from 'najm-kit';
import { NBadge } from 'najm-kit';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';;
import { useTranslation } from '@/hooks/useLanguage';
import { Label } from 'najm-kit';

const AttendanceCard = ({ data }: any) => {
  const { t } = useTranslation();
  const isStudent = data.type === 'student';
  const name = isStudent ? data.student?.name : data.teacher?.name;

  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center dark:bg-primary">
          <User className="w-6 h-6 text-primary dark:text-white" />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-md font-bold">
            {name || '-'}
          </Label>
          <NBadge statusMap={STATUS_COLOR_MAP} status={data.status} />
        </div>

        <div className="space-y-2">
          <NSectionInfo
            icon={CalendarDays}
            iconColor="text-primary"
            label={t('attendance.table.date')}
            value={data.date}
            valueColor="text-primary"
          />

          {isStudent && data.class?.name && (
            <NSectionInfo
              icon={School}
              iconColor="text-muted-foreground"
              label={t('attendance.table.class')}
              value={`${data.class.name}${data.section?.name ? ` - ${data.section.name}` : ''}`}
              valueColor="text-foreground font-medium"
            />
          )}

          {isStudent && data.subject?.name && (
            <NSectionInfo
              icon={BookOpen}
              iconColor="text-muted-foreground"
              label={t('attendance.table.subject')}
              value={data.subject.name}
              valueColor="text-foreground font-medium"
            />
          )}

          {data.notes && (
            <NSectionInfo
              icon={User}
              iconColor="text-muted-foreground"
              label={t('attendance.table.notes')}
              value={data.notes}
              valueColor="text-muted-foreground"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceCard;
