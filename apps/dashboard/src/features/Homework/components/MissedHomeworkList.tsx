'use client'

import React from 'react';
import { NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { HomeworkMissedRecord } from '@sms/contracts';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { COMPLETION_COLORS } from '../config/homeworkCompletion';

/** One pupil's missed homework, newest first: when, which subject, what, and the teacher's remark. */
export default function MissedHomeworkList({ records }: { records: HomeworkMissedRecord[] }) {
  const { t } = useTranslation();
  const { displayDateOnly } = useSchoolFormat();

  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {records.map((record) => (
        <li key={record.id} className="flex flex-col gap-1 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">{record.title}</span>
            <NBadge color={COMPLETION_COLORS[record.status]} look="soft" label={t(`homework.completion.status.${record.status}`)} />
          </div>
          <div className="text-xs text-muted-foreground">
            {[displayDateOnly(record.date), record.subject?.name, record.subSubject].filter(Boolean).join(' · ')}
          </div>
          {record.note && <div className="text-sm text-muted-foreground">{record.note}</div>}
        </li>
      ))}
    </ul>
  );
}
