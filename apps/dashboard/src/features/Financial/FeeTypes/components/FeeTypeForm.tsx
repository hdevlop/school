'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';

import { NFormSectionHeader as FormSectionHeader } from 'najm-kit';
import React from 'react'
import { DollarSign, Tag, FileText, Layers, CreditCard } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { useTranslation } from '@/hooks/useLanguage'
import { feeTypeSchema } from '@/lib/validations'
import { buildFill, isDevFill } from '@/lib/devFill'
import { useEnum } from '@/hooks/useEnum'

const FeeTypeForm = ({ feeType = null }) => {

   const { t } = useTranslation();
   const { pop } = useDialog();
   
   const defaultValues = {
      ...(feeType?.id && { id: feeType.id }),
      name: feeType?.name || '',
      description: feeType?.description || '',
      category: feeType?.category || 'tuition', 
      amount: feeType?.amount || '',
      paymentType: feeType?.paymentType || 'recurring',
   }

   const categoryOptions = useEnum('feeCategory')
   const paymentTypeOptions = useEnum('paymentType')


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
            devTools={{ enabled: isDevFill, fill: () => buildFill(feeTypeSchema, { category: categoryOptions }) }}
         >
            <div className='flex flex-col gap-4'>
               <FormSectionHeader
                  icon={DollarSign}
                  title={t('feeTypes.form.feeTypeInformation')}
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
