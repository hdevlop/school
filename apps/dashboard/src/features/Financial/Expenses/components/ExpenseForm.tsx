'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';

import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import { DollarSign, FileText, Layers, Calendar, CreditCard, Receipt, Hash, Activity } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { useTranslation } from 'najm-i18n/react'
import { expenseSchema } from '../config/expenseSchemas'
import { buildExpenseCategoryOptions, buildExpenseStatusOptions } from '../config/expenseOptions'
import { buildPaymentMethodOptions } from '@/features/Financial/Payment/config/paymentOptions'
import { useWatch } from 'react-hook-form'

// Payment dates are recorded in the payment workflow; this form uses one date and receipt reference.
const expenseFormSchema = expenseSchema.omit({ paymentDate: true, invoiceNumber: true });

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
      receiptNumber: expense?.receiptNumber || '',
      checkNumber: expense?.checkNumber || '',
      ...(isEdit && { status: expense?.status || 'pending' }),
      notes: expense?.notes || '',
   }

   const handleSubmit = async (expenseData) => {
      const data = {
         ...expenseData,
         checkNumber: expenseData.paymentMethod === 'check' ? expenseData.checkNumber : null,
      };

      if (isEdit) {
         pop(data);
         return;
      }

      const { status: _status, ...createData } = data;
      pop(createData);
   }

   return (
      <NForm id='expense-form' schema={expenseFormSchema} defaultValues={defaultValues} onSubmit={handleSubmit} >
         <ExpenseFormContent isEdit={isEdit} />
      </NForm>
   )
}

const ExpenseFormContent = ({ isEdit }) => {
   const { t } = useTranslation();
   const paymentMethod = useWatch({ name: 'paymentMethod' });

   // Salaries are recorded via Payroll (payslips), not as expenses — keep them out to avoid double-counting.
   const expenseCategoryOptions = buildExpenseCategoryOptions(t);
   const paymentMethodOptions = buildPaymentMethodOptions(t);
   const statusOptions = buildExpenseStatusOptions(t);

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
               name='receiptNumber'
               type='text'
               icon={Receipt}
               formLabel={t('expenses.form.receiptNumber')}
               placeholder={t('expenses.form.receiptNumberPlaceholder')}
            />

            {paymentMethod === 'check' && (
               <div className='md:col-span-2'>
                  <FormInput
                     name='checkNumber'
                     type='text'
                     icon={Hash}
                     formLabel={t('expenses.form.checkNumber')}
                     placeholder={t('expenses.form.checkNumberPlaceholder')}
                  />
               </div>
            )}

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
