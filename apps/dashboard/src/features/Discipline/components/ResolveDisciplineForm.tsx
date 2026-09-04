'use client';

import { FileCheck2, FileText, Gavel } from 'lucide-react';
import { FormInput, NForm, NFormSectionHeader, useDialog } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { resolveDisciplineSchema } from '@/lib/validations';
import { DISCIPLINE_ACTIONS } from '../disciplineConstants';

export default function ResolveDisciplineForm() {
  const { t } = useTranslation();
  const { pop } = useDialog();
  return (
    <NForm
      id="resolve-discipline-form"
      schema={resolveDisciplineSchema}
      defaultValues={{ actionType: 'verbal_warning', actionNote: '', resolutionNote: '' }}
      onSubmit={(data) => pop({ ...data, actionNote: data.actionNote || null })}
    >
      <div className="flex flex-col gap-4">
        <NFormSectionHeader icon={FileCheck2} title={t('discipline.dialogs.resolveTitle')} />
        <FormInput
          name="actionType" type="select" formLabel={t('discipline.form.actionType')} icon={Gavel} required
          items={DISCIPLINE_ACTIONS.map((value) => ({ value, label: t(`discipline.actions.${value}`) }))}
        />
        <FormInput name="actionNote" type="textarea" formLabel={t('discipline.form.actionNote')} placeholder={t('discipline.form.actionNotePlaceholder')} icon={FileText} />
        <FormInput name="resolutionNote" type="textarea" formLabel={t('discipline.form.resolutionNote')} placeholder={t('discipline.form.resolutionNotePlaceholder')} icon={FileCheck2} required />
      </div>
    </NForm>
  );
}
