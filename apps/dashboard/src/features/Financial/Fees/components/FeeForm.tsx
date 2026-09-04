'use client'

import React from 'react'
import { NForm } from 'najm-kit';
import { FormInput } from 'najm-kit';
import { User } from 'lucide-react'
import { useTranslation } from 'najm-i18n/react'
import { useDialog } from 'najm-kit'
import { bulkFeeFormSchema } from '@/lib/validations'
import { BulkFeeFormContent } from './BulkFeeForm'
import { injectStudentIdToFees } from '../utils/feeUtils'
import SimpleFeeForm from './EditFeeForm'

const FeeForm = ({ fee = null, students = [], feeTypes = [] }) => {
   const { t } = useTranslation()
   const { pop } = useDialog()

   if (fee) {
      return <SimpleFeeForm fee={fee} feeTypes={feeTypes} />
   }

   const studentOptions = students.map((student) => ({
      value: student.id,
      label: `${student.name} - ${student.studentCode}`
   }))

   const handleSubmit = async (formData) => {
      const processedData = {
         fees: injectStudentIdToFees(formData.fees, formData.studentId)
      }
      pop(processedData)
   }

   return (
      <NForm
         id='bulk-fee-form'
         schema={bulkFeeFormSchema}
         defaultValues={{ studentId: null, fees: [] }}
         onSubmit={handleSubmit}
      >
         <FormInput
            name='studentId'
            type='combobox'
            icon={User}
            formLabel={t('fees.form.student')}
            placeholder={t('fees.form.studentPlaceholder')}
            searchPlaceholder={t('fees.form.searchStudent') || 'Search student...'}
            emptyMessage={t('fees.form.noStudentFound') || 'No student found.'}
            items={studentOptions}
            required={true}
         />
         <BulkFeeFormContent feeTypes={feeTypes} students={students} />
      </NForm>
   )
}

export default FeeForm
