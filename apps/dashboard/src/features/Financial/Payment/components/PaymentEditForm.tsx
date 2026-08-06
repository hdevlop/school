'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';

import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import { DollarSign, FileText, Calendar, CreditCard, Receipt, Hash, CalendarClock } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { useTranslation } from '@/hooks/useLanguage'
import { useEnum } from '@/hooks/useEnum'
import { z } from 'zod'
import { useActiveForm } from '@/hooks/useActiveForm'
import { paymentMethodEnum } from '@/lib/ZodEnum'

const paymentEditSchema = z.object({
  id: z.string(),
  paymentMethod: paymentMethodEnum,
  paymentDate: z.string().min(1, 'Payment date is required'),
  checkNumber: z.string().max(50, 'Check number too long').optional().nullable(),
  checkDueDate: z.string().optional().nullable(),
  transactionRef: z.string().max(100, 'Transaction reference too long').optional().nullable(),
  receiptNumber: z.string().max(50, 'Receipt number too long').optional().nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

const PaymentEditForm = ({ payment }) => {
  const { pop } = useDialog();

  const defaultValues = {
    id: payment?.id || '',
    paymentMethod: payment?.paymentMethod || 'cash',
    paymentDate: payment?.paymentDate || '',
    checkNumber: payment?.checkNumber || '',
    checkDueDate: payment?.checkDueDate || '',
    transactionRef: payment?.transactionRef || '',
    receiptNumber: payment?.receiptNumber || '',
    notes: payment?.notes || '',
  }

  const handleSubmit = async (paymentData) => {
    pop(paymentData);
  }

  return (
    <NForm id='payment-form' schema={paymentEditSchema} defaultValues={defaultValues} onSubmit={handleSubmit} >
      <PaymentEditFormContent />
    </NForm>
  )
}

const PaymentEditFormContent = () => {
  const { t } = useTranslation();
  const { watch } = useActiveForm();

  const paymentMethod = watch('paymentMethod');

  const paymentMethodOptions = useEnum('paymentMethod');

  return (
    <>
      <FormSectionHeader
        icon={DollarSign}
        title={t('payments.form.basicInformation')}
      />

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <FormInput
          name='paymentDate'
          type='date'
          icon={Calendar}
          formLabel={t('payments.form.paymentDate')}
          required={true}
        />

        <FormInput
          name='paymentMethod'
          type='select'
          icon={CreditCard}
          formLabel={t('payments.form.paymentMethod')}
          items={paymentMethodOptions}
          required={true}
        />
      </div>

      <FormSectionHeader
        icon={FileText}
        title={t('payments.form.paymentDetails')}
      />

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <FormInput
          name='receiptNumber'
          type='text'
          icon={Receipt}
          formLabel={t('payments.form.receiptNumber')}
          placeholder={t('payments.form.receiptNumberPlaceholder')}
        />

        <FormInput
          name='transactionRef'
          type='text'
          icon={Hash}
          formLabel={t('payments.form.transactionRef')}
          placeholder={t('payments.form.transactionRefPlaceholder')}
        />

        {(paymentMethod === 'check') && (
          <>
            <FormInput
              name='checkNumber'
              type='text'
              icon={Hash}
              formLabel={t('payments.form.checkNumber')}
              placeholder={t('payments.form.checkNumberPlaceholder')}
            />

            <FormInput
              name='checkDueDate'
              type='date'
              icon={CalendarClock}
              formLabel={t('payments.form.checkDueDate')}
            />
          </>
        )}
      </div>

      <FormInput
        name='notes'
        type='textarea'
        icon={FileText}
        formLabel={t('payments.form.notes')}
        placeholder={t('payments.form.notesPlaceholder')}
      />
    </>
  )
}

export default PaymentEditForm
