import React from 'react';
import { Zap, AlertTriangle, Trash2 } from 'lucide-react';
import { getInstallmentAvailableAmount, isInstallmentPayable, usePaymentStore } from '../../store/paymentStore';

export const AutoAllocationTools = ({ studentFees }) => {

    const paymentAmount = usePaymentStore((state) => state.paymentDetails.amount);
    const handleAutoAllocate = usePaymentStore((state) => state.handleAutoAllocate);
    const selectAllOverdue = usePaymentStore((state) => state.selectAllOverdue);
    const clearAllSelections = usePaymentStore((state) => state.clearAllSelections);
    const setPaymentDetails = usePaymentStore((state) => state.setPaymentDetails);

    const handlePayAllOverdue = () => {
        const total = selectAllOverdue(studentFees?.fees || []);
        setPaymentDetails({ amount: total.toFixed(2) });
    };

    const handleAutoAllocateOldest = () => {
        handleAutoAllocate('oldest', studentFees?.fees || []);
    };

    const totalOverdue = (studentFees?.fees || [])
        .flatMap((fee: any) => fee.installments || [])
        .filter((inst: any) => inst.status === 'overdue' && isInstallmentPayable(inst))
        .reduce((sum: number, inst: any) => sum + getInstallmentAvailableAmount(inst), 0);

    return (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-4">
                {/* Left Section - Icon + Text */}
                <div className="flex items-center gap-3">
                    {/* Icon Container */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <Zap className="text-white" size={20} strokeWidth={2.5} />
                    </div>
                    
                    {/* Text */}
                    <div className="flex flex-col">
                        <h3 className="text-sm font-semibold leading-tight text-foreground">
                            Smart Auto-Allocation
                        </h3>
                        <p className="mt-0.5 text-xs leading-tight text-muted-foreground">
                            Automatically distribute payment across fees
                        </p>
                    </div>
                </div>

                {/* Right Section - Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Pay All Overdue Button */}
                    <button
                        onClick={handlePayAllOverdue}
                        disabled={totalOverdue <= 0}
                        className="flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    >
                        <AlertTriangle size={14} strokeWidth={2.5} />
                        <span>Pay All Overdue ({totalOverdue.toFixed(2)} MAD)</span>
                    </button>

                    {/* Oldest First Button */}
                    <button
                        onClick={handleAutoAllocateOldest}
                        disabled={!paymentAmount}
                        className="flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    >
                        <Zap size={14} strokeWidth={2.5} />
                        <span>Oldest First</span>
                    </button>

                    {/* Clear All Button */}
                    <button
                        onClick={clearAllSelections}
                        className="flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                        <Trash2 size={14} strokeWidth={2.5} />
                        <span>Clear All</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
