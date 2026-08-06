'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';

import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import { DollarSign, FileText, Tag, CalendarClock, Percent, Activity, Wallet } from 'lucide-react'
import { useTranslation } from '@/hooks/useLanguage'
import { useActiveForm } from '@/hooks/useActiveForm'
import { useCallback, useEffect } from 'react'
import { feeSchema } from '@/lib/validations'
import { useDialog } from 'najm-kit'
import { calculateFeeAmounts } from '@/lib/utils'
import { usePrefix } from 'najm-kit';

import { useEnum } from '@/hooks/useEnum'

const EditFeeForm = ({ fee, feeTypes = [] }) => {
   const { pop } = useDialog();

   const defaultValues = {
      id: fee?.id || undefined,
      studentId: fee?.studentId || '',
      feeTypeId: fee?.feeTypeId || '',
      schedule: fee?.schedule || 'monthly',
      baseAmount: fee?.baseAmount || 0,
      netAmount: fee?.netAmount || 0,
      discountAmount: fee?.discountAmount || 0,
      status: fee?.status || 'pending',
      notes: fee?.notes || '',
   }

   const handleSubmit = async (feeData) => {
      pop(feeData)
   }

   const isEditMode = !!fee?.id

   return (
      <div className='w-full'>
         <NForm
            id='simple-fee-form'
            schema={feeSchema}
            defaultValues={defaultValues}
            onSubmit={handleSubmit}
         >
            <SimpleFeeFormContent feeTypes={feeTypes} isEditMode={isEditMode} />
         </NForm>
      </div>
   )
}

const SimpleFeeFormContent = ({ feeTypes, isEditMode }) => {
   const { t } = useTranslation()
   const { watch, setValue, register } = useActiveForm()
   const prefix = usePrefix();
   const f = useCallback((name: string) => prefix != null ? `${prefix}.${name}` : name, [prefix]);

   const feeTypeId = watch(f('feeTypeId'))
   const baseAmount = watch(f('baseAmount')) || 0
   const discountAmount = watch(f('discountAmount')) || 0
   const schedule = watch(f('schedule'))

   const selectedFeeType = feeTypes.find(ft => ft.id === feeTypeId)
   const feeTypeAmount = selectedFeeType?.amount || 0
   const paymentType = selectedFeeType?.paymentType || 'recurring'

   const isScheduleDisabled = paymentType === 'oneTime'

   useEffect(() => {
      if (feeTypeId && selectedFeeType && !baseAmount) {
         setValue(f('baseAmount'), feeTypeAmount)
      }
   }, [feeTypeId, selectedFeeType, feeTypeAmount, baseAmount, f, setValue])

   useEffect(() => {
      if (feeTypeId && selectedFeeType) {
         if (paymentType === 'oneTime' && schedule !== 'oneTime') {
            setValue(f('schedule'), 'oneTime')
            return
         }
         const { netAmount } = calculateFeeAmounts(
            paymentType,
            baseAmount,
            schedule,
            discountAmount
         )

         setValue(f('netAmount'), netAmount)
      }
   }, [baseAmount, schedule, discountAmount, selectedFeeType, paymentType, f, feeTypeId, setValue])

   const scheduleOptions = useEnum('schedule')

   const statusOptions = [
      { value: 'pending', label: t('fees.status.pending') },
      { value: 'paid', label: t('fees.status.paid') },
      { value: 'partiallyPaid', label: t('fees.status.partiallyPaid') },
      { value: 'overdue', label: t('fees.status.overdue') },
   ]

   return (
      <div className='flex flex-col gap-2'>
         {/* Hidden fields for IDs */}
         {isEditMode && <input type="hidden" {...register(f('id'))} />}
         <input type="hidden" {...register(f('studentId'))} />

         <FormSectionHeader
            icon={DollarSign}
            title={t('fees.form.feeInformation')}
         />

         <div className='flex flex-col gap-2'>

            {!isEditMode && (
               <FormInput
                  name='feeTypeId'
                  type='select'
                  icon={Tag}
                  formLabel={t('fees.form.feeType') || 'Fee Type'}
                  placeholder={t('fees.form.feeTypePlaceholder') || 'Select fee type'}
                  items={feeTypes.map(ft => ({ value: ft.id, label: ft.name }))}
                  required={true}
               />
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
               <FormInput
                  name='baseAmount'
                  type='number'
                  icon={DollarSign}
                  formLabel={t('fees.form.amount') || 'Amount'}
                  placeholder="0.00"
                  required={true}
               />

               <FormInput
                  name='schedule'
                  type='select'
                  icon={CalendarClock}
                  formLabel={t('fees.form.schedule')}
                  placeholder={t('fees.form.schedulePlaceholder')}
                  items={scheduleOptions}
                  required={true}
                  disabled={isScheduleDisabled}
               />
            </div>

            {/* Discount Amount and Status - 2 Columns */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
               <FormInput
                  name='discountAmount'
                  type='number'
                  icon={Percent}
                  formLabel={t('fees.form.discountAmount')}
                  placeholder={t('fees.form.discountAmountPlaceholder')}
               />

               <FormInput
                  name='status'
                  type='select'
                  icon={Activity}
                  formLabel={t('fees.form.status')}
                  items={statusOptions}
               />
            </div>

            {/* Net Amount - Full Width */}
            <FormInput
               name='netAmount'
               type='number'
               icon={Wallet}
               formLabel={t('fees.form.netAmount') || 'Net Amount'}
               readOnly={true}
               className="border-green-700 bg-green-100"
            />
         </div>

         <FormSectionHeader
            icon={FileText}
            title={t('fees.form.additionalInformation')}
         />

         <div className='grid grid-cols-1 gap-2'>
            <FormInput
               name='notes'
               type='textarea'
               icon={FileText}
               formLabel={t('fees.form.notes')}
               placeholder={t('fees.form.notesPlaceholder')}
            />
         </div>
      </div>
   )
}

export default EditFeeForm