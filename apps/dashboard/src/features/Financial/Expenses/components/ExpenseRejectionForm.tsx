'use client';

import { useMemo } from 'react';
import { FormInput, NForm } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useDialog } from '@/shared/useDialog';
import { createExpenseSchemas } from '../config/expenseSchemas';

export default function ExpenseRejectionForm() {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const schema = useMemo(() => createExpenseSchemas(t).rejection, [t]);

  return (
    <NForm
      id="expense-rejection-form"
      schema={schema}
      defaultValues={{ rejectionReason: '' }}
      onSubmit={(data) => pop(data)}
    >
      <FormInput
        name="rejectionReason"
        type="textarea"
        formLabel={t('expenses.actions.rejectReason')}
        required
      />
    </NForm>
  );
}
