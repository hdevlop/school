'use client'

import { NForm, FormInput } from 'najm-kit'
import { Calendar, CreditCard, Hash } from 'lucide-react'
import { useWatch } from 'react-hook-form'
import { useTranslation } from 'najm-i18n/react'
import { useDialog } from '@/shared/useDialog'
import { localDateInput } from 'najm-kit/format'
import { buildPaymentMethodOptions } from '@/features/Financial/Payment/config/paymentOptions'
import { expensePaymentSchema } from '../config/expenseSchemas'

/** Records the payment of an approved expense through its payment route. */
const ExpensePaymentForm = ({ expense }) => {
  const { pop } = useDialog()
  const defaultValues = {
    paymentMethod: expense?.paymentMethod || 'cash',
    paymentDate: localDateInput(),
    checkNumber: expense?.checkNumber || '',
  }

  return (
    <NForm
      id='expense-payment-form'
      schema={expensePaymentSchema}
      defaultValues={defaultValues}
      onSubmit={(data) => pop({ ...data, checkNumber: data.paymentMethod === 'check' ? data.checkNumber : null })}
    >
      <ExpensePaymentFields />
    </NForm>
  )
}

const ExpensePaymentFields = () => {
  const { t } = useTranslation()
  const paymentMethod = useWatch({ name: 'paymentMethod' })
  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
      <FormInput name='paymentMethod' type='select' icon={CreditCard} formLabel={t('expenses.form.paymentMethod')} items={buildPaymentMethodOptions(t)} required />
      <FormInput name='paymentDate' type='date' icon={Calendar} formLabel={t('expenses.form.paymentDate')} required />
      {paymentMethod === 'check' && (
        <FormInput name='checkNumber' type='text' icon={Hash} formLabel={t('expenses.form.checkNumber')} placeholder={t('expenses.form.checkNumberPlaceholder')} required />
      )}
    </div>
  )
}

export default ExpensePaymentForm
