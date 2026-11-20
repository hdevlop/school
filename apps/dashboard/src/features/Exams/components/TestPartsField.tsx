'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';
import { ListOrdered, Plus, Trash2 } from 'lucide-react';
import { FormInput, NButton } from 'najm-kit';
import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { TEST_PART_LIMITS } from '@sms/contracts';
import { newTestPartId } from '../config/testPartSchemas';

/**
 * The questions of a test, listed when the exam or assessment is created.
 * After the Contrôle, the class report asks how many pupils answered each one
 * correctly.
 */
export function TestPartsField() {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: 'parts' });

  return (
    <section className="flex flex-col gap-2">
      <FormSectionHeader icon={ListOrdered} title={t('exams.parts.title')} />
      <p className="text-sm text-muted-foreground">{t('exams.parts.hint')}</p>
      {fields.length === 0 && <p className="text-sm text-muted-foreground">{t('exams.parts.empty')}</p>}
      {fields.map((field, index) => {
        const name = t('exams.parts.labelPlaceholder', { number: index + 1 });
        return (
          <div key={field.id} className="flex items-start gap-1.5 rounded-lg border border-border bg-muted/20 p-1.5 focus-within:border-primary/40">
            <span aria-hidden="true" className="mt-1.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <FormInput name={`parts.${index}.label`} type="text" placeholder={name} aria-label={name} />
            </div>
            <NButton type="button" variant="ghost" size="sm" onClick={() => remove(index)}
              className="mt-0.5 size-9 shrink-0 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={`${t('exams.parts.remove')} · ${name}`} title={t('exams.parts.remove')}>
              <Trash2 className="size-4" aria-hidden="true" />
            </NButton>
          </div>
        );
      })}
      {fields.length < TEST_PART_LIMITS.parts && (
        <NButton type="button" variant="outline" size="sm" leftIcon={<Plus className="size-4" />}
          onClick={() => append({ id: newTestPartId(), label: t('exams.parts.labelPlaceholder', { number: fields.length + 1 }) })}
          className="self-start border-dashed text-muted-foreground hover:border-primary/60 hover:bg-primary/5 hover:text-foreground">
          {t('exams.parts.add')}
        </NButton>
      )}
    </section>
  );
}
