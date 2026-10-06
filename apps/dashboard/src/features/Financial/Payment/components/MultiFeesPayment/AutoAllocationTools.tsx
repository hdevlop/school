import React from 'react';
import { Zap, AlertTriangle, Trash2 } from 'lucide-react';
import { getInstallmentAvailableAmount, isInstallmentPayable, usePaymentStore } from '../../store/paymentStore';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useTranslation } from 'najm-i18n/react';

export const AutoAllocationTools = ({ studentFees }) => {
    const { t } = useTranslation();
    const { majorMoney } = useSchoolFormat();

    const paymentAmount = usePaymentStore((state) => state.paymentDetails.amount);
    const handleAutoAllocate = usePaymentStore((state) => state.handleAutoAllocate);
    const selectAllOverdue = usePaymentStore((state) => state.selectAllOverdue);
    const clearAllSelections = usePaymentStore((state) => state.clearAllSelections);

    // The amount received follows the selection in the form itself; writing
    // it here as well left the register and the field showing different sums.
    const handlePayAllOverdue = () => {
        selectAllOverdue(studentFees?.fees || []);
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
                            {t('payments.allocation.title')}
                        </h3>
                        <p className="mt-0.5 text-xs leading-tight text-muted-foreground">
                            {t('payments.allocation.subtitle')}
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
                        <span>{t('payments.allocation.payAllOverdue', { amount: majorMoney(totalOverdue) })}</span>
                    </button>

                    {/* Oldest First Button */}
                    <button
                        onClick={handleAutoAllocateOldest}
                        disabled={!paymentAmount}
                        className="flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    >
                        <Zap size={14} strokeWidth={2.5} />
                        <span>{t('payments.allocation.oldestFirst')}</span>
                    </button>

                    {/* Clear All Button */}
                    <button
                        onClick={clearAllSelections}
                        className="flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                        <Trash2 size={14} strokeWidth={2.5} />
                        <span>{t('payments.allocation.clearAll')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
