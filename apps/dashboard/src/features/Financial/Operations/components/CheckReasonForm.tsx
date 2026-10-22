'use client';

import { FileText } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { FormInput, NForm } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { createCheckReasonSchema, type CheckReasonValues } from '../config/checkSchemas';

export const CHECK_REASON_FORM_ID = 'check-reason-form';

/** The reason asked before a check is bounced or voided; the dialog's primary button submits it. */
export default function CheckReasonForm({ label }: { label: string }) {
  const { pop } = useDialog();
  const { t } = useTranslation();
  const schema = useMemo(() => createCheckReasonSchema(t), [t]);
  return (
    <NForm
      id={CHECK_REASON_FORM_ID}
      schema={schema}
      defaultValues={{ reason: '' }}
      onSubmit={(data: CheckReasonValues) => pop(data)}
    >
      <FormInput name="reason" type="textarea" formLabel={label} icon={FileText} required />
    </NForm>
  );
}
