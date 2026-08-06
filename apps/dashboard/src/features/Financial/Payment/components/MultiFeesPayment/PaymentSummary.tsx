import React from 'react';
import { CheckCircle2, AlertCircle, CheckCircle } from 'lucide-react';
import { Label } from 'najm-kit';
import { usePaymentStore } from '../../store/paymentStore';
import { PaymentActions } from './PaymentActions';

export const PaymentSummary = ({ compact = false }: { compact?: boolean }) => {
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
      <div className={`flex flex-col gap-3 ${compact ? '' : 'h-full flex-1'}`}>

         <div className={`bg-linear-to-br from-gray-900 to-gray-800 text-white rounded-xl p-4 shadow-lg border border-gray-700 ${compact ? '' : 'h-full flex-1'}`}>

            <div className="flex items-center justify-between mb-3">
               <Label className="font-bold text-base text-white flex items-center gap-2">
                  💰 Cashier Register
               </Label>
               {isExactAmount && (
                  <CheckCircle2 className="text-green-400" size={20} />
               )}
               {isInsufficientCash && (
                  <AlertCircle className="text-red-400" size={20} />
               )}
            </div>

            <div className="space-y-2.5">
               {/* Cashier Register Display */}
               <div className="bg-linear-to-br from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg p-3">
                  <div className="grid grid-cols-3 gap-3">

                     <div className="flex flex-col text-center">
                        <Label className="text-gray-400 text-[10px] uppercase ">
                           Total Selected
                        </Label>
                        <Label className="text-xl font-bold text-white">
                           {debtSelected.toFixed(2)}
                           <Label className="text-[10px] text-gray-400">MAD</Label>
                        </Label>
                     </div>

                     <div className="flex flex-col text-center">
                        <Label className="text-gray-400 text-[10px] uppercase ">
                           Cash Received
                        </Label>
                        <Label className="text-xl font-bold text-blue-400 ">
                           {cashReceived.toFixed(2)}
                           <Label className="text-[10px] text-gray-400">MAD</Label>
                        </Label>
                     </div>

                     <div className="flex flex-col text-center">
                        <Label className="text-gray-400 text-[10px] uppercase  ">
                           💸 Give Customer
                        </Label>
                        <Label className={`text-xl font-bold  ${change < 0 ? 'text-red-400' :
                           change === 0 ? 'text-green-400' :
                              'text-green-300'
                           }`}>
                           {Math.abs(change).toFixed(2)}
                           <Label className={`text-[10px] ${change < 0 ? 'text-red-400' : 'text-gray-400'
                              }`}>
                              {change < 0 ? 'SHORT!' : 'MAD'}
                           </Label>
                        </Label>
                     </div>

                  </div>
               </div>

               {/* Selected Items Inside Summary */}
               {selectedCount > 0 && (
                  <div className="flex flex-col border-t border-gray-700 pt-2.5">
                     <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="text-green-400" size={14} />
                        <Label className="text-xs font-semibold text-gray-300">
                           Selected Items ({selectedCount})
                        </Label>
                     </div>
                     <div className={`grid gap-2 overflow-y-auto ${compact ? 'grid-cols-1' : 'h-full grid-cols-2'}`}>
                        {Object.values(selectedInstallments).map((inst: any) => (
                           <div key={inst.id} className="bg-gray-800/50 rounded-lg p-2 border border-gray-700 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                 <Label className="text-2xl">{inst.feeIcon}</Label>
                                 <div className='flex flex-col gap-[0.5]'>
                                    <Label className="text-sm font-medium text-white">
                                       {inst.feeName} #{inst.number}
                                    </Label>
                                    <Label className="text-xs text-gray-400 block">{inst.dueDate}</Label>
                                 </div>
                              </div>
                              <div className='flex flex-col gap-[0.5] items-center'>
                                 <Label className="text-sm font-bold text-green-400 block">
                                    {inst.allocatedAmount.toFixed(2)}
                                 </Label>
                                 <Label className="text-xs text-gray-400 block">MAD</Label>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>
         </div>

         <PaymentActions />
      </div>
   );
};
