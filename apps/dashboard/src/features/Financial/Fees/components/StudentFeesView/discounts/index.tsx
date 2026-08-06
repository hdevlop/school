"use client"

import { Badge, NButton, useDialog } from 'najm-kit'
import { DollarSign, Pencil, Plus, Tag } from 'lucide-react'
import { useFees } from '@/features/Financial/Fees/hooks/useFees'
import { useFeeTypes } from '@/features/Financial/FeeTypes/hooks/useFeeTypes'
import { formatCurrency } from '@/lib/utils'
import { usePublicSettings } from '@/features/Settings/hooks/useSettings'
import EditFeeForm from '../../EditFeeForm'

interface DiscountsTabProps {
  fees: any[]
  studentId?: string
}

export const DiscountsTab = ({ fees = [] }: DiscountsTabProps) => {
  const { openDialog } = useDialog()
  const { feeTypes } = useFeeTypes()
  const { updateFee, isUpdating } = useFees()
  const { publicSettings } = usePublicSettings()
  const currency = publicSettings?.currency || 'MAD'

  const totalDiscount = fees.reduce((sum, fee) => {
    const base = Number(fee.baseAmount) || 0
    const net = Number(fee.netAmount) || 0
    return sum + Math.max(0, base - net)
  }, 0)

  const feesWithDiscount = fees.filter(fee => {
    const base = Number(fee.baseAmount) || 0
    const net = Number(fee.netAmount) || 0
    return base - net > 0
  })

  const handleEditDiscount = (fee: any) => {
    openDialog({
      title: `Edit Discount — ${fee.name}`,
      children: <EditFeeForm fee={fee} feeTypes={feeTypes} />,
      width: 'xl',
      primaryButton: {
        form: 'simple-fee-form',
        text: 'Save Discount',
        loading: isUpdating,
        onClick: async (feeData: any) => {
          await updateFee(feeData)
        }
      }
    })
  }

  if (fees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Tag className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">No fees assigned to this student</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-1">
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Tag className="h-4 w-4 text-primary" />
          <span>{feesWithDiscount.length} of {fees.length} fees have a discount</span>
        </div>
        {totalDiscount > 0 && (
          <Badge variant="secondary" className="border-green-200 bg-green-50 text-green-700">
            Total saved: {formatCurrency(totalDiscount, currency)}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {fees.map((fee) => {
          const base = Number(fee.baseAmount) || 0
          const net = Number(fee.netAmount) || 0
          const discount = Math.max(0, base - net)
          const hasDiscount = discount > 0
          const discountPct = base > 0 ? Math.round((discount / base) * 100) : 0
          const category = fee.feeType?.category || fee.feeTypeCategory || fee.type || fee.category || fee.schedule || 'fee'

          return (
            <div
              key={fee.id}
              className={`relative rounded-lg border bg-card p-4 pr-32 ${
                hasDiscount ? 'border-green-300 bg-green-50/40' : ''
              }`}
            >
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <DollarSign className="h-6 w-6" />
                </div>

                <div className="min-w-0 space-y-2">
                  <p className="truncate text-sm font-semibold text-foreground">{fee.name}</p>

                  <div className="flex min-w-0 items-center gap-2 text-sm">
                    <Tag className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">Category:</span>
                    <span className="truncate text-primary">{category}</span>
                  </div>

                  <div className="flex min-w-0 items-center gap-2 text-sm">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="shrink-0 text-muted-foreground">Amount:</span>
                    <span className={hasDiscount ? 'text-muted-foreground line-through' : 'font-semibold text-green-700'}>
                      {formatCurrency(base || net, currency)}
                    </span>
                    {hasDiscount && (
                      <Badge variant="secondary" className="shrink-0 border-green-200 bg-green-100 px-2 font-semibold text-green-800">
                        {formatCurrency(net, currency)}
                      </Badge>
                    )}
                    {hasDiscount && (
                      <Badge variant="secondary" className="shrink-0 border-green-200 bg-green-50 px-2 text-xs font-semibold text-green-700">
                        -{discountPct}%
                      </Badge>
                    )}
                  </div>

                  {fee.discountReason && (
                    <p className="line-clamp-1 text-xs italic text-green-700">"{fee.discountReason}"</p>
                  )}
                </div>
              </div>

              <NButton
                variant="outline"
                size="sm"
                className="absolute right-4 top-4 h-8 px-3 text-xs"
                onClick={() => handleEditDiscount(fee)}
                title={hasDiscount ? 'Edit discount' : 'Add discount'}
              >
                {hasDiscount ? (
                  <>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </>
                ) : (
                  <>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Discount
                  </>
                )}
              </NButton>
            </div>
          )
        })}
      </div>
    </div>
  )
}
