'use client'

import React, { useCallback, useMemo, useState } from 'react';
import { CalendarCheck, UsersRound } from 'lucide-react';
import { Label, NajmScroll, NEmptyState } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useBusinessDate } from '@/features/Settings/hooks/useSettings';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { PaymentForm } from '../MultiFeesPayment/PaymentForm';
import { PaymentSummary } from '../MultiFeesPayment/PaymentSummary';
import { AutoAllocationTools } from '../MultiFeesPayment/AutoAllocationTools';
import { usePaymentStore } from '../../store/paymentStore';
import { dueInstallments, sumAvailable, type FamilyChild } from '../../utils/familyPayment';
import { FamilyChildSection } from './FamilyChildSection';

interface FamilyPaymentProps {
   parent: { id: string; name: string };
   familyChildren: FamilyChild[];
}

/**
 * A parent paying for several children at once: one form, one register, one
 * receipt, and each child's fees below. Selections share the single-child
 * payment store; each installment carries its child.
 */
const FamilyPayment = ({ parent, familyChildren }: FamilyPaymentProps) => {
   const { t } = useTranslation();
   const { majorMoney } = useSchoolFormat();
   const { businessDate } = useBusinessDate();
   const selectInstallments = usePaymentStore((state) => state.selectInstallments);
   const [feesByChild, setFeesByChild] = useState<Record<string, any[]>>({});

   const onFees = useCallback((childId: string, fees: any[]) => {
      setFeesByChild((current) => (current[childId] === fees ? current : { ...current, [childId]: fees }));
   }, []);

   const childOrder = useMemo(() => familyChildren.map((child) => child.id), [familyChildren]);
   const allFees = useMemo(
      () => childOrder.flatMap((childId) => feesByChild[childId] ?? []),
      [childOrder, feesByChild],
   );
   const allFamilyFees = useMemo(() => ({ fees: allFees }), [allFees]);
   const allDue = useMemo(() => dueInstallments(allFees, businessDate), [allFees, businessDate]);
   const family = useMemo(() => ({ parentId: parent.id, childOrder }), [parent.id, childOrder]);

   return (
      <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white">
         <div className="shrink-0 bg-linear-to-r from-pink-600 to-orange-500 px-5 py-3 text-white">
            <div className="flex items-center gap-3">
               <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white text-pink-600">
                  <UsersRound size={18} />
               </span>
               <div>
                  <Label className="text-xl font-bold text-white">{t('payments.family.title')}</Label>
                  <Label className="mt-0.5 block text-xs text-pink-100">
                     {t('payments.family.subtitle', { parent: parent.name, number: familyChildren.length })}
                  </Label>
               </div>
            </div>
         </div>

         {familyChildren.length === 0 ? (
            <NEmptyState surface="panel" icon={FEATURE_ICONS.students} title={t('payments.family.noChildren')} className="m-4" />
         ) : (
            <div className="grid min-h-0 flex-1 grid-cols-[1fr_2fr] grid-rows-[minmax(0,1fr)] gap-4 overflow-hidden p-4 max-lg:flex max-lg:flex-col max-lg:overflow-y-auto">
               <div className="flex min-h-0 flex-col gap-3 overflow-hidden max-lg:shrink-0 max-lg:overflow-visible">
                  <Label className="text-sm font-semibold">💳 {t('payments.form.paymentDetails')}</Label>
                  <PaymentForm family={family} />
                  <PaymentSummary />
               </div>

               {/* Below lg the columns stack: what to pay first, then how. */}
               <div className="flex min-h-0 flex-col gap-3 overflow-hidden border-l-2 border-gray-300 pl-4 max-lg:order-first max-lg:shrink-0 max-lg:overflow-visible max-lg:border-l-0 max-lg:pl-0">
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                     <Label className="text-sm font-semibold">📋 {t('payments.family.selectChildren')}</Label>
                     {/* The usual visit: this month for every child, in one click. */}
                     <button
                        type="button"
                        onClick={() => selectInstallments(allDue)}
                        disabled={allDue.length === 0}
                        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                     >
                        <CalendarCheck size={14} strokeWidth={2.5} />
                        <span>{t('payments.family.payAllDue', { amount: majorMoney(sumAvailable(allDue)) })}</span>
                     </button>
                  </div>
                  <div className="shrink-0">
                     <AutoAllocationTools studentFees={allFamilyFees} />
                  </div>
                  <NajmScroll axis="y" autoHide="never" className="min-h-0 flex-1">
                     <div className="flex flex-col gap-3 pe-3">
                        {familyChildren.map((child) => (
                           <FamilyChildSection key={child.id} child={child} onFees={onFees} />
                        ))}
                     </div>
                  </NajmScroll>
               </div>
            </div>
         )}
      </div>
   );
};

export default FamilyPayment;
