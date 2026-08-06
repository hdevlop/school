'use client'

import { formatMAD } from '@/lib/format'
import { useTranslation } from '@/hooks/useLanguage'
import type { PreviewInstallment } from '@/lib/utils'

interface InstallmentPreviewTableProps {
  installments: PreviewInstallment[]
  visible?: boolean
}

const InstallmentPreviewTable = ({ installments, visible = true }: InstallmentPreviewTableProps) => {
   const { t } = useTranslation()

   if (!visible || !installments || installments.length === 0) return null

   const total = installments.reduce((sum, inst) => sum + inst.amount, 0)

   return (
      <div className="rounded-lg border mt-2 overflow-hidden">
         <div className="bg-muted/50 px-3 py-2">
            <h4 className="text-sm font-semibold">
               {t('fees.form.installmentPreview') || 'Installment Schedule Preview'}
            </h4>
            <p className="text-xs text-muted-foreground">
               {installments.length} {t('fees.form.installments') || 'installments'} — {t('fees.form.total') || 'Total'}: {formatMAD(total)}
            </p>
         </div>
         <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
               <thead>
                  <tr className="border-b bg-muted/30">
                     <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">#</th>
                     <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">
                        {t('fees.form.dueDate') || 'Due Date'}
                     </th>
                     <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">
                        {t('fees.form.amount') || 'Amount'}
                     </th>
                  </tr>
               </thead>
               <tbody>
                  {installments.map((inst) => (
                     <tr key={inst.number} className="border-b last:border-b-0">
                        <td className="px-3 py-1.5 text-muted-foreground">{inst.number}</td>
                        <td className="px-3 py-1.5">{inst.dueDate}</td>
                        <td className="px-3 py-1.5 text-right font-medium">{formatMAD(inst.amount)}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   )
}

export default InstallmentPreviewTable
