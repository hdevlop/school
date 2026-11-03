'use client'

import React, { useMemo } from 'react'
import { NForm } from 'najm-kit';
import { User } from 'lucide-react'
import { useTranslation } from 'najm-i18n/react'
import { useDialog } from '@/shared/useDialog'
import { FormStudentCombobox } from '@/features/Students/components/StudentCombobox'
import { createFeeSchemas } from '../config/feeSchemas'
import { BulkFeeFormContent } from './BulkFeeForm'
import { injectStudentIdToFees } from '../utils/feeUtils'
import SimpleFeeForm from './EditFeeForm'

const FeeForm = ({ fee = null, students = [], feeTypes = [] }) => {
   const { t } = useTranslation()
   const bulkFeeFormSchema = useMemo(() => createFeeSchemas(t).bulkFeeForm, [t])
   const { pop } = useDialog()

   if (fee) {
      return <SimpleFeeForm fee={fee} feeTypes={feeTypes} />
   }

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
         <FormStudentCombobox
            icon={User}
            formLabel={t('fees.form.student')}
            placeholder={t('fees.form.studentPlaceholder')}
            searchPlaceholder={t('fees.form.searchStudent') || 'Search student...'}
            emptyMessage={t('fees.form.noStudentFound') || 'No student found.'}
            students={students}
            required={true}
         />
         <BulkFeeFormContent feeTypes={feeTypes} students={students} />
      </NForm>
   )
}

export default FeeForm
