"use client"

import { NButton, NForm, NSkeleton, Tabs, TabsContent, TabsList, TabsTrigger } from 'najm-kit';

import { StudentHeader } from "./header";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useDialog } from "najm-kit";
import { useFees } from "@/features/Financial/Fees/hooks/useFees";
import MultiFeesPayment from "@/features/Financial/Payment/components/MultiFeesPayment";
import { CreditCard, Receipt, History, FileText, Tag, Plus } from "lucide-react";
import { PaymentHistory } from "./paymentHistory";
import { Documents } from "./documents";
import { FeesOverview } from "./feeOverview";
import { DiscountsTab } from "./discounts";
import { usePayments } from "@/features/Financial/Payment/hooks/usePayments";
import { useFeeTypes } from "@/features/Financial/FeeTypes/hooks/useFeeTypes";
import { getInstallmentAvailableAmount, isInstallmentPayable, usePaymentStore } from "@/features/Financial/Payment/store/paymentStore";
import { BulkFeeFormContent } from "@/features/Financial/Fees/components/BulkFeeForm";
import { feesSchema } from "@/lib/validations";
import { injectStudentIdToFees } from "@/features/Financial/Fees/utils/feeUtils";

const TAB_STYLES = "border-0 cursor-pointer data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:!border-b-2 data-[state=active]:!border-primary rounded-none px-6 py-3 data-[state=active]:!text-primary text-muted-foreground hover:text-primary transition-colors";

const getFeeBalance = (fee: any) => {
  const explicitBalance = Number(fee?.balance ?? fee?.totalDue ?? fee?.dueAmount);
  if (Number.isFinite(explicitBalance)) return explicitBalance;

  const netAmount = Number(fee?.netAmount ?? 0);
  const paidAmount = Number(fee?.paidAmount ?? fee?.totalPaid ?? 0);
  return Math.max(netAmount - paidAmount, 0);
};

const AddStudentFeesForm = ({
  studentId,
  feeTypes,
}: {
  studentId: string;
  feeTypes: any[];
}) => {
  const { pop } = useDialog();

  const handleSubmit = async (formData: any) => {
    pop({
      fees: injectStudentIdToFees(formData.fees || [], studentId),
    });
  };

  return (
    <NForm
      id="student-bulk-fee-form"
      schema={feesSchema}
      defaultValues={{ fees: [] }}
      onSubmit={handleSubmit}
    >
      <BulkFeeFormContent
        feeTypes={feeTypes}
        showInstallmentPreview={false}
        showEffectiveDateField={false}
      />
    </NForm>
  );
};

const StudentFeesViewSkeleton = ({ className, hideHeader = false }: { className: string; hideHeader?: boolean }) => (
  <div className={`flex flex-col gap-3 ${className}`}>
    {!hideHeader && (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <NSkeleton className="h-12 w-12 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <NSkeleton className="h-5 w-40" />
              <NSkeleton className="h-3 w-28" />
            </div>
          </div>
        </div>
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-4">
            <NSkeleton className="mb-3 h-3 w-24" />
            <NSkeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
    )}

    <div className="flex items-center justify-between border-b border-border pb-2">
      <div className="flex gap-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <NSkeleton key={index} className="h-9 w-28" />
        ))}
      </div>
      <NSkeleton className="h-9 w-24" />
    </div>

    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <NSkeleton className="h-5 w-32" />
            <NSkeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="space-y-3">
            <NSkeleton className="h-4 w-full" />
            <NSkeleton className="h-4 w-3/4" />
            <NSkeleton className="h-2 w-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const StudentFeesView = ({ studentId, hideHeader = false, initialFeeId = null }) => {
  const { studentFees, isStudentFeesLoading, createBulkFees, isBulkCreating } = useFees({ studentId });
  const { createPayment } = usePayments();
  const { feeTypes } = useFeeTypes();
  const [selectedFeeId, setSelectedFeeId] = useState(initialFeeId);
  const [activeTab, setActiveTab] = useState("overview");
  const { openDialog } = useDialog();
  const resetPayment = usePaymentStore((state) => state.reset);
  const selectInstallments = usePaymentStore((state) => state.selectInstallments);
  const setPaymentDetails = usePaymentStore((state) => state.setPaymentDetails);
  const loadingClassName = hideHeader ? 'min-h-64' : 'min-h-[calc(100vh-12rem)]';
  const selectedFee = studentFees?.fees?.find(fee => fee.id === selectedFeeId) || null;
  const hasPayableBalance = Boolean(
    studentFees?.fees?.some((fee: any) => getFeeBalance(fee) > 0)
  );
  const addableFeeTypes = useMemo(() => {
    const assignedFeeTypeIds = new Set(
      (studentFees?.fees || [])
        .map((fee: any) => fee?.feeTypeId)
        .filter(Boolean)
    );

    return (feeTypes || []).filter((feeType: any) => !assignedFeeTypeIds.has(feeType.id));
  }, [feeTypes, studentFees?.fees]);

  useEffect(() => {
    if (initialFeeId) {
      setSelectedFeeId(initialFeeId);
    }
  }, [initialFeeId]);

  useEffect(() => {
    const fees = studentFees?.fees || [];
    if (fees.length === 0) return;

    const selectedFeeExists = selectedFeeId && fees.some((fee: any) => fee.id === selectedFeeId);
    if (!selectedFeeExists) {
      setSelectedFeeId(fees[0].id);
    }
  }, [studentFees, selectedFeeId]);

  const handleFeeClick = (fee) => {
    setSelectedFeeId(selectedFeeId === fee.id ? null : fee.id);
  };

  const handleAddFee = () => {
    openDialog({
      title: 'Add Fees',
      children: <AddStudentFeesForm studentId={studentId} feeTypes={addableFeeTypes} />,
      width: 'xxl',
      height: 'xl',
      primaryButton: {
        form: 'student-bulk-fee-form',
        text: 'Add Fees',
        loading: isBulkCreating,
        onClick: async (bulkData: any) => {
          await createBulkFees(bulkData);
        }
      }
    });
  };

  const decorateInstallmentsForPayment = useCallback((fee: any, installments: any[]) => {
    return (installments || []).map((installment: any) => ({
      ...installment,
      feeId: fee.id,
      feeIcon: fee.icon,
      feeColor: fee.color,
      feeName: fee.name?.split(' ')[0] || fee.name,
    }));
  }, []);

  const buildPaymentTarget = useCallback((target?: { fee?: any; installment?: any }) => {
    const hasScopedTarget = Boolean(target?.fee || target?.installment);

    if (!studentFees || !hasScopedTarget) {
      return {
        paymentStudentFees: studentFees,
        selectedTargets: [],
      };
    }

    const sourceFee = target?.fee || studentFees.fees?.find((fee: any) =>
      fee.installments?.some((installment: any) => installment.id === target?.installment?.id)
    );

    if (!sourceFee) {
      return {
        paymentStudentFees: studentFees,
        selectedTargets: [],
      };
    }

    const scopedInstallments = target?.installment
      ? sourceFee.installments?.filter((installment: any) => installment.id === target.installment.id)
      : sourceFee.installments;

    const paymentStudentFees = {
      ...studentFees,
      fees: [
        {
          ...sourceFee,
          installments: scopedInstallments,
        },
      ],
    };

    const selectedTargets = decorateInstallmentsForPayment(sourceFee, scopedInstallments).filter(isInstallmentPayable);

    return {
      paymentStudentFees,
      selectedTargets,
    };
  }, [decorateInstallmentsForPayment, studentFees]);

  const handlePayClick = async (target?: { fee?: any; installment?: any }) => {
    if (!studentFees) return;

    const scopedTarget = target?.fee || target?.installment ? target : undefined;
    const { paymentStudentFees, selectedTargets } = buildPaymentTarget(scopedTarget);
    const hasPayableSelection = scopedTarget ? selectedTargets.length > 0 : hasPayableBalance;

    if (!hasPayableSelection) return;

    resetPayment();

    if (selectedTargets.length > 0) {
      const totalSelected = selectedTargets.reduce(
        (total: number, installment: any) => total + getInstallmentAvailableAmount(installment),
        0
      );

      selectInstallments(selectedTargets);
      setPaymentDetails({ amount: totalSelected.toFixed(2) });
    }

    try {
      const compactPayment = Boolean(scopedTarget?.installment);
      const paymentData = await openDialog({
        children: (
          <MultiFeesPayment
            studentId={studentId}
            studentFees={paymentStudentFees}
            compact={compactPayment}
          />
        ),
        showButtons: false,
        width: compactPayment ? 'xl' : 'full',
        height: compactPayment ? 'auto' : 'full',
        className: 'p-0 bg-transparent border-none shadow-none',
      });

      if (paymentData) {
        await createPayment(paymentData);
      }
    } finally {
      resetPayment();
    }
  };

  if (isStudentFeesLoading) {
    return <StudentFeesViewSkeleton className={loadingClassName} hideHeader={hideHeader} />;
  }

  if (!studentFees) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">No fee data available</p>
      </div>
    );
  }

  const tabConfig = [
    {
      value: "overview",
      label: "Fees Overview",
      icon: Receipt,
      content: (
        <FeesOverview
          fees={studentFees.fees}
          selectedFee={selectedFee}
          onFeeClick={handleFeeClick}
          onPayFee={(fee: any) => handlePayClick({ fee })}
          onPayInstallment={(installment: any) => handlePayClick({ installment })}
          fullWidth={hideHeader}
        />
      ),
    },
    {
      value: "discounts",
      label: "Discounts",
      icon: Tag,
      content: <DiscountsTab fees={studentFees.fees} studentId={studentId} />,
    },
    {
      value: "history",
      label: "Payment History",
      icon: History,
      content: <PaymentHistory studentId={studentId} studentFees={studentFees} />,
    },
    {
      value: "documents",
      label: "Documents",
      icon: FileText,
      content: <Documents studentId={studentId} />,
    },
  ];

  return (
    <div className="flex flex-col gap-2 h-full">
      {!hideHeader && (
        <StudentHeader
          studentFees={studentFees}
          onPayClick={() => handlePayClick()}
          payDisabled={!hasPayableBalance}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
        <div className="flex items-center justify-between border-b border-gray-200">
          <TabsList className="bg-transparent rounded-none justify-start h-auto p-0 border-0">
            {tabConfig.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className={TAB_STYLES}>
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {(activeTab === "overview" || hideHeader) && (
            <div className="flex items-center gap-2 pb-1 pr-1">
              {activeTab === "overview" && (
                <NButton
                  onClick={handleAddFee}
                  size="sm"
                  variant="outline"
                  bordered
                  className="gap-2 border-border bg-transparent text-foreground font-semibold hover:bg-accent hover:text-accent-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Add Fee
                </NButton>
              )}

              {hideHeader && (
                <>
                  {studentFees.alerts?.hasOverdueFees && (
                    <div className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/20 rounded-full px-3 py-1">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full" />
                      <span className="text-xs font-medium text-destructive">
                        {studentFees.alerts.message}
                      </span>
                    </div>
                  )}
                  <NButton
                    onClick={() => handlePayClick()}
                    disabled={!hasPayableBalance}
                    title={!hasPayableBalance ? 'Nothing to pay' : undefined}
                    size="sm"
                    className="px-5 font-semibold"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay
                  </NButton>
                </>
              )}
            </div>
          )}
        </div>

        {tabConfig.map(({ value, content }) => (
          <TabsContent key={value} value={value} className="flex-1 h-full min-h-0">
            {content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
