import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Clock, CheckCircle2, LockKeyhole } from 'lucide-react';
import { Label, NajmScroll, NTable } from 'najm-kit';
import { getInstallmentAvailableAmount, isInstallmentPayable, usePaymentStore } from '../../store/paymentStore';

const toAmount = (value: unknown) => Number(value ?? 0) || 0;
const formatMAD = (value: unknown) => `${toAmount(value).toLocaleString()} MAD`;

const StatusBadge = ({ status, reservedAmount = 0, availableAmount = 0 }) => {
   const isReserved = status !== 'paid' && toAmount(reservedAmount) > 0 && toAmount(availableAmount) <= 0;
   const configs: Record<string, any> = {
      paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      reserved: { icon: LockKeyhole, label: 'Reserved', className: 'bg-slate-100 text-slate-700 border-slate-300' },
      overdue: { icon: AlertTriangle, label: 'Overdue', className: 'bg-red-50 text-red-700 border-red-200' },
      pending: { icon: Clock, label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
   };
   const config = isReserved ? configs.reserved : configs[status] || configs.pending;
   const Icon = config.icon;

   return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.className}`}>
         {Icon && <Icon size={12} />}
         {config.label}
      </span>
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
   const rows = useMemo(() => (
      fee.installments
         .filter((inst: any) => stats.fullyPaid || inst.status !== 'paid')
         .map((inst: any) => ({
            ...inst,
            availableAmount: getInstallmentAvailableAmount(inst),
            feeId: fee.id,
            feeIcon: fee.icon,
            feeColor: fee.color,
            feeName: fee.name.split(' ')[0],
         }))
   ), [fee, stats.fullyPaid]);

   const payableRows = rows.filter(isInstallmentPayable);
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
               onChange={() => toggleAllFeeInstallments(fee.id, [fee])}
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
                  title={isPayable ? 'Select installment' : 'No available balance'}
               />
            );
         },
         size: 48,
      },
      {
         accessorKey: 'number',
         header: 'Installment',
         enableSorting: false,
         cell: ({ getValue }: any) => (
            <span className="font-medium text-gray-900 text-xs">Installment #{getValue()}</span>
         ),
      },
      {
         accessorKey: 'dueDate',
         header: 'Due Date',
         enableSorting: false,
         cell: ({ getValue }: any) => (
            <span className="text-xs text-gray-600">{getValue()}</span>
         ),
      },
      {
         accessorKey: 'availableAmount',
         header: 'Available',
         enableSorting: false,
         cell: ({ row }: any) => {
            const inst = row.original;
            const availableAmount = getInstallmentAvailableAmount(inst);
            const reservedAmount = toAmount(inst.reservedAmount);
            const paidAmount = toAmount(inst.paidAmount);

            return (
               <div className="flex flex-col">
                  <span className={`text-xs font-semibold ${availableAmount > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                     {formatMAD(availableAmount)}
                  </span>
                  {reservedAmount > 0 && (
                     <span className="text-[11px] font-medium text-slate-500">
                        Reserved {formatMAD(reservedAmount)}
                     </span>
                  )}
                  {paidAmount > 0 && inst.status !== 'paid' && (
                     <span className="text-[11px] font-medium text-emerald-600">
                        Paid {formatMAD(paidAmount)}
                     </span>
                  )}
               </div>
            );
         },
      },
      {
         accessorKey: 'allocatedAmount',
         header: 'Allocate',
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
         header: 'Status',
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
   ], [allPayableSelected, fee, payableRows.length, selectedInstallments, somePayableSelected, toggleAllFeeInstallments, toggleInstallment, updateAllocatedAmount]);

   return (
      <div className="border-t border-gray-300 bg-muted/20 p-2">
         <NTable
            data={rows}
            columns={columns}
            defaultMode="table"
            showPagination
            defaultPagination={{ pageIndex: 0, pageSize: 10 }}
            pageSizeOptions={[10, 20, 30, 40, 50]}
            showAddButton={false}
            showViewToggle={false}
            showColumnVisibility={false}
            showCheckbox={false}
            dynamicHeight={false}
            bordered
            noDataText="No installments to pay"
            className="rounded-md bg-white text-xs [&_tbody_td]:py-2 [&_thead_th]:py-2"
         />
      </div>
   );
};


export const InstallmentList = ({ studentFees }) => {

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

      return { total, paid, overdue, fullyPaid };
   };

   return (
      <NajmScroll
         axis="y"
         autoHide="never"
         className="payment-fees-scroll min-h-0 flex-1"
         options={{ scrollbars: { visibility: 'visible' } }}
      >
         <div className="flex flex-col gap-2.5">
            {studentFees.fees.map(fee => {
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
                           <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-lg">{fee.icon}</span>
                           <Label className="truncate text-sm font-semibold text-gray-900">{fee.name}</Label>
                           <div className="flex min-w-0 items-center gap-2 text-xs text-gray-500">
                              <span className="whitespace-nowrap">{stats.total} installments</span>
                              <span>•</span>
                              <span className="whitespace-nowrap">{stats.paid} payment{stats.paid !== 1 ? 's' : ''}</span>
                              {stats.overdue > 0 && (
                                 <>
                                    <span>•</span>
                                    <span className="whitespace-nowrap text-red-600 font-medium">{stats.overdue} overdue</span>
                                 </>
                              )}
                           </div>
                        </div>
                        <div className="ml-3 flex shrink-0 items-center gap-2">
                           {stats.fullyPaid && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                 <CheckCircle2 size={12} />
                                 Fully Paid
                              </span>
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
