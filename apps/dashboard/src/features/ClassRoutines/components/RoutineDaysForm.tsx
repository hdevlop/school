'use client';

import { CalendarDays } from 'lucide-react';
import { FormInput, NForm, useDialog, useNForm } from 'najm-kit';
import { z } from 'zod';
import { useTranslation } from 'najm-i18n/react';
import { ROUTINE_DAYS } from '../types';
import type { RoutineDaysFormProps } from '../types';
import { routineDayLabel } from '../utils/labels';

export default function RoutineDaysForm({ activeDays }: RoutineDaysFormProps) {
  const { pop } = useDialog();
  const { t } = useTranslation();
  const schema = z.object({
    activeDays: z.array(z.enum(ROUTINE_DAYS)).min(1, t('classRoutines.ui.validation.selectDay')),
  });
  const form = useNForm({
    schema,
    defaultValues: { activeDays: [...activeDays] },
  });

  return (
    <NForm
      id="routine-days-form"
      schema={schema}
      form={form}
      variant="compact"
      onSubmit={(data) => pop(data)}
    >
      <FormInput
        name="activeDays"
        type="multiselect"
        formLabel={t('classRoutines.ui.fields.teachingDays')}
        placeholder={t('classRoutines.ui.fields.teachingDays')}
        icon={CalendarDays}
        items={ROUTINE_DAYS.map((day) => ({
          value: day,
          label: routineDayLabel(day, t),
        }))}
        maxDisplay={ROUTINE_DAYS.length}
        showSearch={false}
        required
      />
    </NForm>
  );
}
