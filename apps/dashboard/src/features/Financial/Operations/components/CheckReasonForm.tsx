'use client';

import { FileText } from 'lucide-react';
import { FormInput, NForm, useDialog } from 'najm-kit';
import { checkReasonSchema, type CheckReasonValues } from '../config/checkSchemas';

export const CHECK_REASON_FORM_ID = 'check-reason-form';

/** The reason asked before a check is bounced or voided; the dialog's primary button submits it. */
export default function CheckReasonForm({ label }: { label: string }) {
  const { pop } = useDialog();
  return (
    <NForm
      id={CHECK_REASON_FORM_ID}
      schema={checkReasonSchema}
      defaultValues={{ reason: '' }}
      onSubmit={(data: CheckReasonValues) => pop(data)}
    >
      <FormInput name="reason" type="textarea" formLabel={label} icon={FileText} required />
    </NForm>
  );
}
