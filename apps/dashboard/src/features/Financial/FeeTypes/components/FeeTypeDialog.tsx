'use client'

import React, { useState } from 'react'
import { Check, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from 'najm-kit'
import { useTranslation } from '@/hooks/useLanguage'
import { getFeeTypeDisplayName } from '@/features/Financial/Fees/utils/feeUtils'

const FeeTypeSelectionContent = ({ feeTypes, tempSelected, onToggle }) => {
  const { t, language } = useTranslation()

  if (!feeTypes || feeTypes.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          No fee types available
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      <div className="text-sm text-muted-foreground">
        {tempSelected.length} {tempSelected.length === 1 ? 'fee type' : 'fee types'} selected
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-2">
        {feeTypes.map((feeType) => {
          const isSelected = tempSelected.includes(feeType.id)
          return (
            <div
              key={feeType.id}
              onClick={() => onToggle(feeType.id)}
              className={cn(
                "relative p-4 rounded-lg cursor-pointer transition-all",
                "border-2 hover:shadow-md",
                isSelected
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-foreground  hover:border-primary/50 hover:bg-accent/50"
              )}
            >
              {/* Check Icon */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="bg-green-500 rounded-full p-1">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}

              {/* Fee Type Content */}
              <div className="space-y-2">
                <div className="flex items-start gap-2 pr-8">
                  <DollarSign className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm line-clamp-2">
                      {getFeeTypeDisplayName(feeType, t, language)}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-muted-foreground">Amount</div>
                  <div className="font-bold text-primary">
                    ${parseFloat(feeType.amount.toString()).toFixed(2)}
                  </div>
                </div>

                {feeType.paymentType && (
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Payment Type</div>
                    <Badge variant="secondary" className="text-xs">
                      {feeType.paymentType}
                    </Badge>
                  </div>
                )}

                {feeType.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 pt-1">
                    {feeType.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const FeeTypeDialogContent = ({ feeTypes, initialSelectedIds, onSelectionChange }) => {
  const [tempSelected, setTempSelected] = useState<string[]>(initialSelectedIds)

  const toggleFeeType = (feeTypeId: string) => {
    const newSelection = tempSelected.includes(feeTypeId)
      ? tempSelected.filter(id => id !== feeTypeId)
      : [...tempSelected, feeTypeId]

    setTempSelected(newSelection)
    onSelectionChange(newSelection)
  }

  return (
    <FeeTypeSelectionContent
      feeTypes={feeTypes}
      tempSelected={tempSelected}
      onToggle={toggleFeeType}
    />
  )
}
