import { FEATURE_ICONS } from '@/shared/featureIcons';
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, CalendarClock, Clock, CheckCircle2, LockKeyhole, SearchX } from 'lucide-react';
import { NBadge, Label, NajmScroll, NTable, NEmptyState } from 'najm-kit';
import { getInstallmentAvailableAmount, isInstallmentPayable, usePaymentStore } from '../../store/paymentStore';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

const toAmount = (value: unknown) => Number(value ?? 0) || 0;

const StatusBadge = ({ status, reservedAmount = 0, availableAmount = 0 }) => {
   const { t } = useTranslation();
   const isReserved = status !== 'paid' && toAmount(reservedAmount) > 0 && toAmount(availableAmount) <= 0;
   // An installment is `pending` until its due date passes, so here it reads
   // as upcoming: it can be paid ahead, and is not a payment awaiting clearance.
   const configs: Record<string, any> = {
      paid: { label: t('fees.status.paid'), className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      reserved: { icon: LockKeyhole, label: t('installments.status.reserved'), className: 'bg-slate-100 text-slate-700 border-slate-300' },
      overdue: { icon: AlertTriangle, label: t('fees.status.overdue'), className: 'bg-red-50 text-red-700 border-red-200' },
      partiallyPaid: { icon: Clock, label: t('fees.status.partiallyPaid'), className: 'bg-amber-50 text-amber-700 border-amber-200' },
      pending: { icon: CalendarClock, label: t('installments.status.upcoming'), className: 'bg-sky-50 text-sky-700 border-sky-200' },
   };
   const config = isReserved ? configs.reserved : configs[status] || configs.pending;
   const Icon = config.icon;

   return (
      <NBadge className={`inline-flex items-center gap-1 rounded-full font-medium border ${config.className}`}>
         {Icon && <Icon size={12} />}
         {config.label}
      </NBadge>
   );
};

const FeeInstallmentsTable = ({
   fee,
   stats,
   selectedInstallments,
   toggleInstallment,
   toggleAllFeeInstallments,
   updateAllocatedAmount,
}: any) => {
   const { t } = useTranslation();
   const { majorMoney, displayDateOnly } = useSchoolFormat();
   const rows = useMemo(() => (
      fee.installments
         .filter((inst: any) => inst.status !== 'cancelled' && (stats.fullyPaid || inst.status !== 'paid'))
         .map((inst: any) => ({
            ...inst,
            availableAmount: getInstallmentAvailableAmount(inst),
            feeId: fee.id,
            feeIcon: fee.icon,
            feeColor: fee.color,
            feeName: fee.name,
         }))
   ), [fee, stats.fullyPaid]);

   // The dialog collects what is owed now. Future installments stay payable,
   // to pay ahead, but only on request. Selected or reserved ones always show,
   // so nothing counted on the register is hidden.
   const [showUpcoming, setShowUpcoming] = useState(false);
   const { visibleRows, hiddenCount } = useMemo(() => {
      const hidden = new Set(rows.filter((inst: any) => inst.status === 'pending'
         && !selectedInstallments[inst.id]
         && toAmount(inst.reservedAmount) <= 0));
      return {
         visibleRows: showUpcoming ? rows : rows.filter((inst: any) => !hidden.has(inst)),
         hiddenCount: hidden.size,
      };
   }, [rows, selectedInstallments, showUpcoming]);
   // Select-all acts on the rows on screen, never on hidden ones.
   const visibleFee = useMemo(() => ({ ...fee, installments: visibleRows }), [fee, visibleRows]);

   const payableRows = visibleRows.filter(isInstallmentPayable);
   const selectedPayableCount = payableRows.filter((inst: any) => selectedInstallments[inst.id]).length;
   const allPayableSelected = payableRows.length > 0 && selectedPayableCount === payableRows.length;
   const somePayableSelected = selectedPayableCount > 0 && !allPayableSelected;

   const columns = useMemo(() => [
      {
         accessorKey: 'selected',
         header: () => (
            <input
               type="checkbox"
               checked={allPayableSelected}
               disabled={payableRows.length === 0}
               ref={(input) => {
                  if (input) input.indeterminate = somePayableSelected;
               }}
               onChange={() => toggleAllFeeInstallments(visibleFee.id, [visibleFee])}
               className="h-4 w-4 cursor-pointer rounded text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
            />
         ),
         enableSorting: false,
         cell: ({ row }: any) => {
            const inst = row.original;
            const isSelected = selectedInstallments[inst.id];
            const isPayable = isInstallmentPayable(inst);

            return (
               <input
                  type="checkbox"
                  checked={!!isSelected}
                  disabled={!isPayable}
                  onChange={() => toggleInstallment(inst)}
                  className="h-4 w-4 cursor-pointer rounded text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
                  title={isPayable ? t('installments.selectInstallment') : t('installments.noAvailableBalance')}
               />
            );
         },
         size: 48,
      },
      {
         accessorKey: 'number',
         header: t('installments.table.installment'),
         enableSorting: false,
         cell: ({ getValue }: any) => (
            <span className="font-medium text-gray-900 text-xs">{t('installments.number', { number: getValue() })}</span>
         ),
      },
      {
         accessorKey: 'dueDate',
         header: t('installments.table.dueDate'),
         enableSorting: false,
         cell: ({ getValue }: any) => (
            <span className="text-xs text-gray-600">{displayDateOnly(getValue())}</span>
         ),
      },
      {
         accessorKey: 'availableAmount',
         header: t('installments.table.available'),
         enableSorting: false,
         cell: ({ row }: any) => {
            const inst = row.original;
            const availableAmount = getInstallmentAvailableAmount(inst);
            const reservedAmount = toAmount(inst.reservedAmount);
            const paidAmount = toAmount(inst.paidAmount);

            return (
               <div className="flex flex-col">
                  <span className={`text-xs font-semibold ${availableAmount > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                     {majorMoney(availableAmount)}
                  </span>
                  {reservedAmount > 0 && (
                     <span className="text-[11px] font-medium text-slate-500">
                        {t('installments.reservedAmount', { amount: majorMoney(reservedAmount) })}
                     </span>
                  )}
                  {paidAmount > 0 && inst.status !== 'paid' && (
                     <span className="text-[11px] font-medium text-emerald-600">
                        {t('installments.paidAmount', { amount: majorMoney(paidAmount) })}
                     </span>
                  )}
               </div>
            );
         },
      },
      {
         accessorKey: 'allocatedAmount',
         header: t('installments.table.allocate'),
         enableSorting: false,
         cell: ({ row }: any) => {
            const inst = row.original;
            const isSelected = selectedInstallments[inst.id];
            const availableAmount = getInstallmentAvailableAmount(inst);
            const isPayable = isInstallmentPayable(inst);

            return (
               <input
                  type="number"
                  value={isSelected?.allocatedAmount ?? ''}
                  onChange={(e) => updateAllocatedAmount(inst.id, e.target.value)}
                  disabled={!isSelected || !isPayable}
                  className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-right text-xs transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                  step="0.01"
                  min="0"
                  max={availableAmount}
                  placeholder="0"
               />
            );
         },
      },
      {
         accessorKey: 'status',
         header: t('installments.table.status'),
         enableSorting: false,
         cell: ({ row }: any) => (
            <div className="flex justify-center">
               <StatusBadge
                  status={row.original.status}
                  reservedAmount={row.original.reservedAmount}
                  availableAmount={getInstallmentAvailableAmount(row.original)}
               />
            </div>
         ),
      },
   ], [allPayableSelected, visibleFee, payableRows.length, selectedInstallments, somePayableSelected, toggleAllFeeInstallments, toggleInstallment, updateAllocatedAmount, t, majorMoney, displayDateOnly]);

   const nothingDue = visibleRows.length === 0 && hiddenCount > 0;

   return (
      <div className="border-t border-gray-300 bg-muted/20 p-2">
         {nothingDue ? (
            <p className="py-1.5 text-center text-xs text-muted-foreground">{t('installments.nothingDue')}</p>
         ) : (
            <NTable
               data={visibleRows}
               columns={columns}
               defaultMode="table"
               showPagination={visibleRows.length > 10}
               defaultPagination={{ pageIndex: 0, pageSize: 10 }}
               pageSizeOptions={[10, 20, 30, 40, 50]}
               showAddButton={false}
               showViewToggle={false}
               showColumnVisibility={false}
               showCheckbox={false}
               dynamicHeight={false}
               bordered
               renderEmpty={() => (
                 <NEmptyState
                   surface="panel"
                   icon={FEATURE_ICONS.installments}
                   title={t('installments.noneToPay')}
                 />
               )}
               renderFilteredEmpty={() => (
                 <NEmptyState
                   surface="panel"
                   icon={SearchX}
                   title={t('emptyStates.filtered.title')}
                   description={t('emptyStates.filtered.description')}
                 />
               )}
               className="rounded-md bg-white text-xs [&_tbody_td]:py-2 [&_thead_th]:py-2"
            />
         )}
         {(hiddenCount > 0 || showUpcoming) && (
            <button
               type="button"
               onClick={() => setShowUpcoming((shown) => !shown)}
               className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium text-primary hover:bg-muted"
            >
               {showUpcoming ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
               {showUpcoming
                  ? t('installments.hideUpcoming')
                  : t('installments.showUpcoming', { count: hiddenCount })}
            </button>
         )}
      </div>
   );
};


export const InstallmentList = ({ studentFees }) => {
   const { t } = useTranslation();
   const { majorMoney } = useSchoolFormat();

   const selectedInstallments = usePaymentStore((state) => state.selectedInstallments);
   const toggleInstallment = usePaymentStore((state) => state.toggleInstallment);
   const toggleAllFeeInstallments = usePaymentStore((state) => state.toggleAllFeeInstallments);
   const updateAllocatedAmount = usePaymentStore((state) => state.updateAllocatedAmount);
   const [expandedFees, setExpandedFees] = useState({});

   useEffect(() => {
      if (!studentFees) return;
      const initialExpanded = {};
      studentFees.fees.forEach(fee => {
         initialExpanded[fee.id] = false;
      });
      setExpandedFees(initialExpanded);
   }, [studentFees]);

   if (!studentFees) return null;

   const getFeeStats = (fee: any) => {
      const total = fee.installments.length;
      const paid = fee.installments.filter(inst => inst.status === 'paid').length;
      const overdue = fee.installments.filter(inst => inst.status === 'overdue').length;
      const fullyPaid = total > 0 && paid === total;
      // What is owed now: the rows shown before "Pay ahead".
      const due = fee.installments.filter((inst) => inst.status !== 'pending' && isInstallmentPayable(inst));
      const dueAmount = due.reduce((sum, inst) => sum + getInstallmentAvailableAmount(inst), 0);
      const dueSelected = due.filter((inst) => selectedInstallments[inst.id]).length;

      return { total, paid, overdue, fullyPaid, due, dueAmount, dueSelected };
   };

   return (
      <NajmScroll
         axis="y"
         autoHide="never"
         className="payment-fees-scroll min-h-0 flex-1"
         options={{ scrollbars: { visibility: 'visible' } }}
      >
         <div className="flex flex-col gap-2.5">
            {/* A fee with nothing left to pay has no place in a payment; the
                fee cards behind this dialog already show it as paid. */}
            {studentFees.fees
               .filter((fee) => fee.installments.some((inst) => inst.status !== 'paid' && inst.status !== 'cancelled'))
               .map(fee => {
               const stats = getFeeStats(fee);

               return (
                  <div
                     key={fee.id}
                     className={`overflow-hidden rounded-lg border ${stats.fullyPaid ? 'border-emerald-300 bg-emerald-50/60' : 'border-border bg-card'}`}
                  >
                     {/* Fee Header */}
                     <div className={`flex cursor-pointer items-center justify-between px-3 py-2.5 transition-colors ${stats.fullyPaid ? 'bg-emerald-50/60 hover:bg-emerald-50' : `hover:bg-muted/50 ${expandedFees[fee.id] ? 'bg-muted/30' : 'bg-card'}`}`}
                        onClick={() => setExpandedFees({ ...expandedFees, [fee.id]: !expandedFees[fee.id] })}>
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                           {/* Selects the fee's due installments without opening it. */}
                           <input
                              type="checkbox"
                              checked={stats.due.length > 0 && stats.dueSelected === stats.due.length}
                              disabled={stats.due.length === 0}
                              ref={(input) => {
                                 if (input) input.indeterminate = stats.dueSelected > 0 && stats.dueSelected < stats.due.length;
                              }}
                              onClick={(event) => event.stopPropagation()}
                              onChange={() => toggleAllFeeInstallments(fee.id, [{ ...fee, installments: stats.due }])}
                              title={stats.due.length === 0 ? t('installments.nothingDue') : undefined}
                              className="h-4 w-4 shrink-0 cursor-pointer rounded text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
                           />
                           <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-lg">{fee.icon}</span>
                           <Label className="truncate text-sm font-semibold text-gray-900">{fee.name}</Label>
                           <div className="flex min-w-0 items-center gap-2 text-xs text-gray-500">
                              <span className="whitespace-nowrap">{t('installments.summary.installments', { count: stats.total })}</span>
                              <span>•</span>
                              <span className="whitespace-nowrap">{t('installments.summary.payments', { count: stats.paid })}</span>
                              {stats.overdue > 0 && (
                                 <>
                                    <span>•</span>
                                    <span className="whitespace-nowrap text-red-600 font-medium">{t('installments.summary.overdue', { count: stats.overdue })}</span>
                                 </>
                              )}
                           </div>
                        </div>
                        <div className="ml-3 flex shrink-0 items-center gap-2">
                           {stats.dueAmount > 0 && (
                              <span className="whitespace-nowrap text-sm font-semibold text-foreground">
                                 {t('installments.dueAmount', { amount: majorMoney(stats.dueAmount) })}
                              </span>
                           )}
                           {stats.fullyPaid && (
                              <NBadge className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700">
                                 <CheckCircle2 size={12} />
                                 {t('fees.status.paid')}
                              </NBadge>
                           )}
                           {expandedFees[fee.id] ? <ChevronUp className="text-muted-foreground" size={18} /> : <ChevronDown className="text-muted-foreground" size={18} />}
                        </div>
                     </div>

                     {/* Installments Table */}
                     {expandedFees[fee.id] && (
                        <FeeInstallmentsTable
                           fee={fee}
                           stats={stats}
                           selectedInstallments={selectedInstallments}
                           toggleInstallment={toggleInstallment}
                           toggleAllFeeInstallments={toggleAllFeeInstallments}
                           updateAllocatedAmount={updateAllocatedAmount}
                        />
                     )}
                  </div>
               );
            })}
         </div>
      </NajmScroll>
   );
};
