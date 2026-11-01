"use client"


import { PermissionButton } from '@/components/PermissionButton';
import { Badge, NCard } from 'najm-kit'
import { useDialog } from '@/shared/useDialog'
import { DollarSign, Pencil, Plus, Tag } from 'lucide-react'
import { useFees } from '@/features/Financial/Fees/hooks/useFees'
import { useFeeTypes } from '@/features/Financial/FeeTypes/hooks/useFeeTypes'
import { useTranslation } from 'najm-i18n/react'
import { useSchoolFormat } from '@/hooks/useSchoolFormat'
import EditFeeForm from '../../EditFeeForm'
import { getFeeDiscountAmount } from '../../../utils/feeUtils'

interface DiscountsTabProps {
  fees: any[]
  studentId?: string
}

export const DiscountsTab = ({ fees = [] }: DiscountsTabProps) => {
  const { t } = useTranslation()
  const { openDialog } = useDialog()
  const { feeTypes } = useFeeTypes({ activeOnly: false })
  const { updateFee, isUpdating } = useFees({ enabled: false })
  const { majorMoney } = useSchoolFormat()

  const totalDiscount = fees.reduce((sum, fee) => sum + getFeeDiscountAmount(fee), 0)

  const feesWithDiscount = fees.filter(fee => getFeeDiscountAmount(fee) > 0)

  const handleEditDiscount = (fee: any) => {
    openDialog({
      title: `${t('fees.studentView.editDiscount')} — ${fee.name}`,
      children: <EditFeeForm fee={fee} feeTypes={feeTypes} />,
      width: 'xl',
      primaryButton: {
        form: 'simple-fee-form',
        text: t('fees.studentView.saveDiscount'),
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
        <p className="text-sm">{t('fees.studentView.noFees')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-1">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Tag aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
          <span>{t('fees.studentView.discountCount', { count: feesWithDiscount.length, total: fees.length })}</span>
        </div>
        {totalDiscount > 0 && (
          <Badge variant="secondary" className="border-border bg-primary/10 text-primary">
            {t('fees.studentView.totalSaved', { amount: majorMoney(totalDiscount) })}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {fees.map((fee) => {
          const base = Number(fee.grossAmount) || 0
          const net = Number(fee.netAmount) || 0
          const discount = getFeeDiscountAmount(fee)
          const hasDiscount = discount > 0
          const discountPct = base > 0 ? Math.round((discount / base) * 100) : 0
          const category = fee.feeType?.category || fee.feeTypeCategory || fee.type || fee.category || fee.schedule || 'fee'

          return (
            <NCard
              key={fee.id}
              className="border-border p-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <DollarSign className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">{fee.name}</p>
                    <PermissionButton permission="update:fees"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 gap-1.5 border-border px-2.5 text-xs"
                      onClick={() => handleEditDiscount(fee)}
                      title={hasDiscount ? t('fees.studentView.editDiscount') : t('fees.studentView.addDiscount')}
                    >
                      {hasDiscount ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {hasDiscount ? t('common.edit') : t('fees.studentView.discounts')}
                    </PermissionButton>
                  </div>

                  <div className="flex min-w-0 items-center gap-2 text-sm">
                    <Tag className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{t('feeTypes.table.category')}:</span>
                    <span className="truncate text-primary">{
                      t(`feeTypes.category.${category}`) !== `feeTypes.category.${category}`
                        ? t(`feeTypes.category.${category}`)
                        : t(`fees.schedule.${category}`) !== `fees.schedule.${category}`
                          ? t(`fees.schedule.${category}`)
                          : category
                    }</span>
                  </div>

                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="shrink-0 text-muted-foreground">{t('fees.table.amount')}:</span>
                    <span className={hasDiscount ? 'text-muted-foreground line-through' : 'font-semibold tabular-nums text-foreground'}>
                      {majorMoney(base || net)}
                    </span>
                    {hasDiscount && (
                      <Badge variant="secondary" className="shrink-0 border-border bg-primary/10 px-2 font-semibold text-primary">
                        {majorMoney(net)}
                      </Badge>
                    )}
                    {hasDiscount && (
                      <Badge variant="secondary" className="shrink-0 border-border bg-muted px-2 text-xs font-semibold text-foreground">
                        -{discountPct}%
                      </Badge>
                    )}
                  </div>

                  {fee.discountReason && (
                    <p className="line-clamp-2 text-xs italic text-muted-foreground">"{fee.discountReason}"</p>
                  )}
                </div>
              </div>

            </NCard>
          )
        })}
      </div>
    </div>
  )
}
