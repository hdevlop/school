'use client'

import { NForm } from 'najm-kit'
import { AvatarFormInput, FormInput } from 'najm-kit';

import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import React, { useMemo } from 'react'
import { DollarSign, Tag, FileText, Layers, CreditCard } from 'lucide-react'
import { useDialog } from '@/shared/useDialog'
import { useTranslation } from 'najm-i18n/react'
import { createFeeTypeSchema } from '../config/feeTypeSchemas'
import { buildFeeCategoryOptionsFor, buildPaymentTypeOptions } from '../config/feeTypeOptions'

const FeeTypeForm = ({ feeType = null }) => {

   const { t } = useTranslation();
   const feeTypeSchema = useMemo(() => createFeeTypeSchema(t), [t]);
   const { pop } = useDialog();
   
   const defaultValues = {
      ...(feeType?.id && { id: feeType.id }),
      name: feeType?.name || '',
      image: feeType?.image ?? null,
      description: feeType?.description || '',
      category: feeType?.category || 'tuition', 
      amount: feeType?.amount || '',
      paymentType: feeType?.paymentType || 'recurring',
   }

   // A fee type's category is free text, so whatever this record already
   // carries stays selectable even when it is not on the shortlist.
   const categoryOptions = buildFeeCategoryOptionsFor(t, feeType?.category)
   const paymentTypeOptions = buildPaymentTypeOptions(t)

   const handleSubmit = async (feeTypeData) => {
      pop(feeTypeData);
   }

   return (
      <div className='w-full'>
         <NForm
            id='fee-type-form'
            schema={feeTypeSchema}
            defaultValues={defaultValues}
            onSubmit={handleSubmit}
         >
            <div className='flex flex-col gap-4'>
               <FormSectionHeader
                  icon={DollarSign}
                  title={t('feeTypes.form.feeTypeInformation')}
               />

               <div className='grid grid-cols-1 items-start gap-4 md:grid-cols-[auto_minmax(0,1fr)]'>
                  <AvatarFormInput
                     name='image'
                     formLabel={t('feeTypes.form.image')}
                     title={t('feeTypes.form.image')}
                     radius='xl'
                     allowClear
                     previewStyle={{ width: 160, height: 160 }}
                     imageClassName='object-contain'
                  />

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                     <FormInput
                        name='name'
                        type='text'
                        icon={FileText}
                        formLabel={t('feeTypes.form.name')}
                        placeholder={t('feeTypes.form.namePlaceholder')}
                        required={true}
                     />

                     <FormInput
                        name='category'
                        type='select'
                        icon={Layers}
                        formLabel={t('feeTypes.form.category')}
                        placeholder={t('feeTypes.form.categoryPlaceholder')}
                        items={categoryOptions}
                        required={true}
                     />

                     <FormInput
                        name='amount'
                        type='number'
                        icon={DollarSign}
                        formLabel={t('feeTypes.form.amount')}
                        placeholder={t('feeTypes.form.amountPlaceholder')}
                        required={true}
                     />

                     <FormInput
                        name='paymentType'
                        type='select'
                        icon={CreditCard}
                        formLabel={t('feeTypes.form.paymentType')}
                        placeholder={t('feeTypes.form.paymentTypePlaceholder')}
                        items={paymentTypeOptions}
                        required={true}
                     />
                  </div>
               </div>

               <FormSectionHeader
                  icon={Tag}
                  title={t('feeTypes.form.description')}
               />

               <div className='grid grid-cols-1 gap-2'>
                  <FormInput
                     name='description'
                     type='textarea'
                     icon={FileText}
                     formLabel={t('feeTypes.form.descriptionLabel')}
                     placeholder={t('feeTypes.form.descriptionPlaceholder')}
                  />
               </div>

            </div>

         </NForm>
      </div>
   )
}

export default FeeTypeForm
