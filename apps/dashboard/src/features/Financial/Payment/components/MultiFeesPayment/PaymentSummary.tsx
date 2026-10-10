import React from 'react';
import { CheckCircle2, AlertCircle, CheckCircle } from 'lucide-react';
import { Label, NajmScroll } from 'najm-kit';
import { usePaymentStore } from '../../store/paymentStore';
import { PaymentActions } from './PaymentActions';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useTranslation } from 'najm-i18n/react';

export const PaymentSummary = ({ compact = false }: { compact?: boolean }) => {
   const { t } = useTranslation();
   const { majorMoney, displayDateOnly } = useSchoolFormat();
   // Get state from store
   const paymentAmount = usePaymentStore((state) => state.paymentDetails.amount);
   const totalAllocated = usePaymentStore((state) => state.getTotalAllocated());
   const selectedCount = usePaymentStore((state) => state.getSelectedCount());
   const selectedInstallments = usePaymentStore((state) => state.selectedInstallments);

   // Cashier Register Calculations
   const cashReceived = parseFloat(String(paymentAmount || '0'));
   const debtSelected = totalAllocated;
   const change = cashReceived - debtSelected;

   const isExactAmount = change === 0 && cashReceived > 0;
   const isInsufficientCash = change < 0 && cashReceived > 0;

   return (
      <div className={`flex flex-col gap-3 ${compact ? '' : 'min-h-0 flex-1'}`}>

         <div className={`bg-linear-to-br from-gray-900 to-gray-800 text-white rounded-xl p-4 shadow-lg border border-gray-700 ${compact ? '' : 'flex min-h-0 flex-1 flex-col'}`}>

            <div className="flex shrink-0 items-center justify-between mb-3">
               <Label className="font-bold text-base text-white flex items-center gap-2">
                  💰 {t('payments.register.title')}
               </Label>
               {isExactAmount && (
                  <CheckCircle2 className="text-green-400" size={20} />
               )}
               {isInsufficientCash && (
                  <AlertCircle className="text-red-400" size={20} />
               )}
            </div>

            <div className={`flex flex-col gap-2.5 ${compact ? '' : 'min-h-0 flex-1'}`}>
               {/* Cashier Register Display */}
               <div className="shrink-0 bg-linear-to-br from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">

                     <div className="flex items-center justify-between gap-2 text-center sm:flex-col sm:justify-start">
                        <Label className="text-gray-400 text-[10px] uppercase ">
                           {t('payments.register.totalSelected')}
                        </Label>
                        <Label className="text-base sm:text-xl font-bold text-white">
                           {majorMoney(debtSelected)}
                        </Label>
                     </div>

                     <div className="flex items-center justify-between gap-2 text-center sm:flex-col sm:justify-start">
                        <Label className="text-gray-400 text-[10px] uppercase ">
                           {t('payments.register.cashReceived')}
                        </Label>
                        <Label className="text-base sm:text-xl font-bold text-blue-400 ">
                           {majorMoney(cashReceived)}
                        </Label>
                     </div>

                     <div className="flex items-center justify-between gap-2 text-center sm:flex-col sm:justify-start">
                        {/* Less cash than selected is money still owed, not change. */}
                        <Label className="text-gray-400 text-[10px] uppercase  ">
                           {change < 0 ? t('payments.register.missing') : `💸 ${t('payments.register.giveCustomer')}`}
                        </Label>
                        <Label className={`text-base sm:text-xl font-bold  ${change < 0 ? 'text-red-400' :
                           change === 0 ? 'text-green-400' :
                              'text-green-300'
                           }`}>
                           {majorMoney(Math.abs(change))}
                        </Label>
                     </div>

                  </div>
               </div>

               {/* Selected Items Inside Summary */}
               {selectedCount > 0 && (
                  <div className={`flex flex-col border-t border-gray-700 pt-2.5 ${compact ? '' : 'min-h-0 flex-1'}`}>
                     <div className="flex shrink-0 items-center gap-2 mb-2">
                        <CheckCircle className="text-green-400" size={14} />
                        <Label className="text-xs font-semibold text-gray-300">
                           {t('payments.register.selectedItems', { count: selectedCount })}
                        </Label>
                     </div>
                     {/* The register is always dark, so its scrollbar uses the light theme. */}
                     <NajmScroll
                        axis="y"
                        className={compact ? '' : 'min-h-0 flex-1'}
                        options={{ scrollbars: { theme: 'os-theme-light', autoHide: 'never', clickScroll: true } }}
                     >
                        <div className={`grid content-start gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 pr-3 sm:grid-cols-2'}`}>
                           {Object.values(selectedInstallments).map((inst: any) => (
                              <div key={inst.id} className="bg-gray-800/50 rounded-lg p-2 border border-gray-700 flex items-center justify-between gap-2">
                                 <div className="flex min-w-0 items-center gap-2">
                                    <Label className="text-2xl">{inst.feeIcon}</Label>
                                    <div className='flex min-w-0 flex-col gap-[0.5]'>
                                       <Label className="block truncate text-sm font-medium text-white" title={`${inst.feeName} #${inst.number}`}>
                                          {inst.feeName} #{inst.number}
                                       </Label>
                                       <Label className="text-xs text-gray-400 block whitespace-nowrap">{displayDateOnly(inst.dueDate)}</Label>
                                    </div>
                                 </div>
                                 <div className='flex shrink-0 flex-col gap-[0.5] items-center'>
                                    <Label className="text-sm font-bold text-green-400 block">
                                       {majorMoney(inst.allocatedAmount)}
                                    </Label>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </NajmScroll>
                  </div>
               )}
            </div>
         </div>

         <PaymentActions />
      </div>
   );
};
