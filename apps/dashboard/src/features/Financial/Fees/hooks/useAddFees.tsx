'use client'

import { useTranslation } from '@/hooks/useLanguage'
import { useDialog } from 'najm-kit'
import { FeeTypeDialogContent } from '../../FeeTypes/components/FeeTypeDialog'
import {
   FeeFactory,
   getFeeTypeById
} from '../utils/feeUtils'


export const useAddFees = ({ feeTypes, feesData }) => {
   const { t } = useTranslation()
   const { openDialog } = useDialog()

   const handleAddFees = async (_,replace) => {
      const selectedIds = feesData.map(fee => fee.feeTypeId).filter(Boolean)
      let tempSelection = selectedIds

      await openDialog({
         title: t('fees.form.selectFeeTypes') || 'Select Fee Types',
         className: 'lg:!max-w-5xl lg:!max-h-[90vh]',
         children: (
            <FeeTypeDialogContent
               feeTypes={feeTypes}
               initialSelectedIds={selectedIds}
               onSelectionChange={(selected) => { tempSelection = selected }}
            />
         ),
         primaryButton: {
            text: t('fees.form.addSelectedFees') || 'Add Selected Fees',
            icon: 'check',
            variant: 'default',
            onClick: async () => {
               const newIds = tempSelection.filter(id => !selectedIds.includes(id))
               const removedIds = selectedIds.filter(id => !tempSelection.includes(id))

               const newFees = newIds
                  .map(id => getFeeTypeById(feeTypes, id))
                  .filter(Boolean)
                  .map(feeType => FeeFactory.createFromFeeType(feeType))

               const updatedFees = [
                  ...feesData.filter(fee => !removedIds.includes(fee.feeTypeId)),
                  ...newFees
               ]

               replace(updatedFees)
            }
         }
      })
   }

   return { handleAddFees }
}