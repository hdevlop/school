'use client';

import { AlarmClock, Hash, Languages } from 'lucide-react';
import { FormInput, NForm, useDialog } from 'najm-kit';
import { z } from 'zod';
import { useTranslation } from '@/hooks/useLanguage';
import type { RoutinePeriodFormProps } from '../types';

const schema = z.object({
  name: z.string().min(1).max(80),
  startTime: z.string().min(4),
  endTime: z.string().min(4),
  sortOrder: z.coerce.number().int().min(0),
  isBreak: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export default function RoutinePeriodForm({ period }: RoutinePeriodFormProps) {
  const { pop } = useDialog();
  const { t } = useTranslation();
  return (
    <NForm
      id="routine-period-form"
      schema={schema}
      defaultValues={{
        name: period?.name || '',
        startTime: period?.startTime?.slice(0, 5) || '08:00',
        endTime: period?.endTime?.slice(0, 5) || '09:00',
        sortOrder: period?.sortOrder ?? 0,
        isBreak: period?.isBreak ?? false,
        isActive: period?.isActive ?? true,
      }}
      onSubmit={(data) => pop(data)}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput name="name" type="text" formLabel={t('classRoutines.ui.fields.periodName')} icon={Languages} required />
        <FormInput name="sortOrder" type="number" formLabel={t('classRoutines.ui.fields.order')} icon={Hash} required />
        <FormInput name="startTime" type="time" formLabel={t('classRoutines.ui.fields.starts')} icon={AlarmClock} required />
        <FormInput name="endTime" type="time" formLabel={t('classRoutines.ui.fields.ends')} icon={AlarmClock} required />
        <FormInput name="isBreak" type="switch" formLabel={t('classRoutines.ui.fields.breakPeriod')} icon={AlarmClock} />
        <FormInput name="isActive" type="switch" formLabel={t('classRoutines.ui.fields.active')} icon={AlarmClock} />
      </div>
    </NForm>
  );
}
