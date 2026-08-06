'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';

import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import { DollarSign, FileText, Layers, Calendar, CreditCard, CalendarClock, Receipt, Hash, Activity } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { useTranslation } from '@/hooks/useLanguage'
import { useEnum } from '@/hooks/useEnum'
import { expenseSchema } from '@/lib/validations'
import { buildFill, isDevFill } from '@/lib/devFill'
import { DevFormFiller } from '@/components/DevFormFiller'
import { useActiveForm } from '@/hooks/useActiveForm'

const ExpenseForm = ({ expense = null }) => {
   const { pop } = useDialog();
   const isEdit = Boolean(expense?.id);

   const defaultValues = {
      ...(isEdit && { id: expense.id }),
      category: expense?.category || 'supplies',
      title: expense?.title || '',
      amount: expense?.amount || '',
      expenseDate: expense?.expenseDate || '',
      paymentMethod: expense?.paymentMethod || 'cash',
      paymentDate: expense?.paymentDate || '',
      invoiceNumber: expense?.invoiceNumber || '',
      receiptNumber: expense?.receiptNumber || '',
      checkNumber: expense?.checkNumber || '',
      ...(isEdit && { status: expense?.status || 'pending' }),
      notes: expense?.notes || '',
   }

   const handleSubmit = async (expenseData) => {
      if (isEdit) {
         pop(expenseData);
         return;
      }

      const { status: _status, ...createData } = expenseData;
      pop(createData);
   }

   return (
      <NForm id='expense-form' schema={expenseSchema} defaultValues={defaultValues} onSubmit={handleSubmit} devTools={{ enabled: isDevFill, fill: () => buildFill(expenseSchema) }} >
         <DevFormFiller fill={() => buildFill(expenseSchema)} />
         <ExpenseFormContent isEdit={isEdit} />
      </NForm>
   )
}

const ExpenseFormContent = ({ isEdit }) => {
   const { t } = useTranslation();
   const { watch } = useActiveForm();

   const paymentMethod = watch('paymentMethod');

   // Salaries are recorded via Payroll (payslips), not as expenses — keep them out to avoid double-counting.
   const expenseCategoryOptions = useEnum('expenseCategory', { filter: (v) => v !== 'salary' });
   const paymentMethodOptions = useEnum('paymentMethod');
   const statusOptions = useEnum('expenseStatus');

   return (
      <>
         <FormSectionHeader
            icon={DollarSign}
            title={t('expenses.form.basicInformation')}
         />

         <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormInput
               name='category'
               type='select'
               icon={Layers}
               formLabel={t('expenses.form.category')}
               items={expenseCategoryOptions}
               required={true}
            />

            <FormInput
               name='title'
               type='text'
               icon={FileText}
               formLabel={t('expenses.form.title')}
               placeholder={t('expenses.form.titlePlaceholder')}
               required={true}
            />

            <FormInput
               name='amount'
               type='number'
               icon={DollarSign}
               formLabel={t('expenses.form.amount')}
               placeholder={t('expenses.form.amountPlaceholder')}
               required={true}
            />

            <FormInput
               name='expenseDate'
               type='date'
               icon={Calendar}
               formLabel={t('expenses.form.expenseDate')}
               required={true}
            />
         </div>

         <FormSectionHeader
            icon={FileText}
            title={t('expenses.form.paymentInformation')}
         />

         <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormInput
               name='paymentMethod'
               type='select'
               icon={CreditCard}
               formLabel={t('expenses.form.paymentMethod')}
               items={paymentMethodOptions}
            />

            <FormInput
               name='paymentDate'
               type='date'
               icon={CalendarClock}
               formLabel={t('expenses.form.paymentDate')}
            />

            <FormInput
               name='invoiceNumber'
               type='text'
               icon={Receipt}
               formLabel={t('expenses.form.invoiceNumber')}
               placeholder={t('expenses.form.invoiceNumberPlaceholder')}
            />

            <FormInput
               name='receiptNumber'
               type='text'
               icon={Receipt}
               formLabel={t('expenses.form.receiptNumber')}
               placeholder={t('expenses.form.receiptNumberPlaceholder')}
            />

            <div className='md:col-span-2'>
               <FormInput
                  name='checkNumber'
                  type='text'
                  icon={Hash}
                  formLabel={t('expenses.form.checkNumber')}
                  placeholder={t('expenses.form.checkNumberPlaceholder')}
                  disabled={paymentMethod !== 'check'}
               />
            </div>

            {isEdit && (
               <FormInput
                  name='status'
                  type='select'
                  icon={Activity}
                  formLabel={t('expenses.form.status')}
                  items={statusOptions}
               />
            )}

         </div>
         <FormInput
            name='notes'
            type='textarea'
            icon={FileText}
            formLabel={t('expenses.form.notes')}
            placeholder={t('expenses.form.notesPlaceholder')}
         />
      </>
   )
}

export default ExpenseForm
