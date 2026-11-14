'use client'

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { NAvatar, NSkeleton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useFees } from '@/features/Financial/Fees/hooks/useFees';
import { sortFeesByCategory } from '@/features/Financial/Fees/config/feeOrder';
import { useBusinessDate } from '@/features/Settings/hooks/useSettings';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { hasFailedToLoad } from '@/services/apiError';
import { InstallmentList } from '../MultiFeesPayment/InstallmentList';
import { usePaymentStore } from '../../store/paymentStore';
import { childSelectedTotal, dueInstallments, sumAvailable, tagFeesWithChild, type FamilyChild } from '../../utils/familyPayment';

interface FamilyChildSectionProps {
   child: FamilyChild;
   /** Reports this child's fees, tagged with the child, once they load. */
   onFees: (childId: string, fees: any[]) => void;
}

/** One child's fees in the family payment, collapsible, with what is selected for them. */
export const FamilyChildSection = ({ child, onFees }: FamilyChildSectionProps) => {
   const { t } = useTranslation();
   const { majorMoney } = useSchoolFormat();
   const { businessDate } = useBusinessDate();
   const [open, setOpen] = useState(true);
   const { studentFees, studentFeesError, isStudentFeesLoading } = useFees({ studentId: child.id, enabled: false });
   const fees = useMemo(
      () => tagFeesWithChild(sortFeesByCategory<any>(studentFees?.fees ?? []), child),
      [studentFees?.fees, child],
   );
   // InstallmentList resets its open fees when this object changes: keep it stable.
   const listFees = useMemo(() => ({ ...studentFees, fees }), [studentFees, fees]);
   const selectedTotal = usePaymentStore((state) => childSelectedTotal(state.selectedInstallments, child.id));
   const dueAmount = useMemo(() => sumAvailable(dueInstallments(fees, businessDate)), [fees, businessDate]);
   const failed = hasFailedToLoad(studentFeesError, studentFees?.fees);
   const payable = fees.some((fee) => fee.installments.some((inst: any) => inst.status !== 'paid' && inst.status !== 'cancelled'));

   useEffect(() => {
      onFees(child.id, fees);
   }, [child.id, fees, onFees]);

   const placement = [child.class?.name, child.section?.name].filter(Boolean).join('-');

   return (
      <div className="overflow-hidden rounded-lg border border-border bg-card">
         <button
            type="button"
            onClick={() => setOpen((shown) => !shown)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-3 bg-muted/40 px-3 py-2.5 text-start transition-colors hover:bg-muted"
         >
            <div className="flex min-w-0 items-center gap-3">
               <NAvatar src={child.image ?? undefined} fallback={child.name} size="sm" />
               <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-foreground">{child.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                     {[child.studentCode, placement].filter(Boolean).join(' · ')}
                  </span>
               </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
               {dueAmount > 0 && (
                  <span className="whitespace-nowrap text-xs text-muted-foreground max-sm:hidden">
                     {t('installments.dueAmount', { amount: majorMoney(dueAmount) })}
                  </span>
               )}
               {selectedTotal > 0 && (
                  <span className="whitespace-nowrap text-sm font-semibold text-primary">
                     {t('payments.family.childSelected', { amount: majorMoney(selectedTotal) })}
                  </span>
               )}
               {open ? <ChevronUp className="text-muted-foreground" size={18} /> : <ChevronDown className="text-muted-foreground" size={18} />}
            </div>
         </button>

         {open && (
            <div className="border-t border-border p-2">
               {isStudentFeesLoading ? (
                  <div className="flex flex-col gap-2">
                     <NSkeleton className="h-12 w-full rounded-lg" />
                     <NSkeleton className="h-12 w-full rounded-lg" />
                  </div>
               ) : failed ? (
                  <p role="alert" className="py-2 text-center text-xs text-destructive">{t('payments.family.loadFailed')}</p>
               ) : !payable ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">{t('payments.family.nothingDue')}</p>
               ) : (
                  <InstallmentList studentFees={listFees} />
               )}
            </div>
         )}
      </div>
   );
};
