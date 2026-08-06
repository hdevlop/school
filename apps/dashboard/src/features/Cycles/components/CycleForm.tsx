'use client';

import React from 'react';
import { z } from 'zod';
import { CalendarRange, Hash, Languages, ToggleRight } from 'lucide-react';
import { FormInput, NForm, NFormSectionHeader as FormSectionHeader, useDialog } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';

const cycleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  labels: z.object({
    fr: z.string().optional().or(z.literal('')),
    ar: z.string().optional().or(z.literal('')),
    es: z.string().optional().or(z.literal('')),
  }).optional(),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
  active: z.boolean().optional().default(true),
});

const cleanCyclePayload = (data) => {
  const labels = Object.fromEntries(
    Object.entries(data.labels || {})
      .map(([key, value]) => [key, String(value || '').trim()])
      .filter(([, value]) => value),
  );

  return {
    ...data,
    labels: Object.keys(labels).length > 0 ? labels : null,
    active: data.active ?? true,
  };
};

const CycleForm = ({ cycle = null }) => {
  const { t } = useTranslation();
  const { pop } = useDialog();

  const defaultValues = {
    ...(cycle?.id && { id: cycle.id }),
    name: cycle?.name || '',
    sortOrder: cycle?.sortOrder ?? 0,
    active: cycle?.active ?? true,
    labels: {
      fr: cycle?.labels?.fr || '',
      ar: cycle?.labels?.ar || '',
      es: cycle?.labels?.es || '',
    },
  };

  return (
    <NForm
      id="cycle-form"
      schema={cycleSchema}
      defaultValues={defaultValues}
      onSubmit={(data) => pop(cleanCyclePayload(data))}
    >
      <div className="flex flex-col gap-4">
        <FormSectionHeader icon={CalendarRange} title={t('cycles.form.cycleInformation')} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput name="name" type="text" formLabel={t('cycles.form.name')} icon={CalendarRange} required />
          <FormInput name="sortOrder" type="number" formLabel={t('cycles.form.sortOrder')} icon={Hash} />
          <FormInput name="labels.fr" type="text" formLabel={t('cycles.form.labelFr')} icon={Languages} />
          <FormInput name="labels.ar" type="text" formLabel={t('cycles.form.labelAr')} icon={Languages} />
          <FormInput name="labels.es" type="text" formLabel={t('cycles.form.labelEs')} icon={Languages} />
          <FormInput name="active" type="switch" formLabel={t('cycles.form.active')} icon={ToggleRight} />
        </div>
      </div>
    </NForm>
  );
};

export default CycleForm;
