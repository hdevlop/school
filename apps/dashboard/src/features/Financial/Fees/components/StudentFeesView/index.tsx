"use client"

import { NButton, NErrorState, NForbiddenState, NSkeleton, Tabs, TabsContent, TabsList, TabsTrigger } from 'najm-kit';

import { useTranslation } from "najm-i18n/react";
import { StudentHeader } from "./header";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useDialog, useDialogStore } from "najm-kit";
import { useFees } from "@/features/Financial/Fees/hooks/useFees";
import MultiFeesPayment from "@/features/Financial/Payment/components/MultiFeesPayment";
import { PaymentRecordedPrompt } from "@/features/Financial/Payment/components/ReceiptPrint/PaymentRecordedPrompt";
import { CreditCard, Receipt, History, FileText, Tag, Plus } from "lucide-react";
import { PaymentHistory } from "./paymentHistory";
import { Documents } from "./documents";
import { FeesOverview } from "./feeOverview";
import { DiscountsTab } from "./discounts";
import { usePayments } from "@/features/Financial/Payment/hooks/usePayments";
import { useFeeTypes } from "@/features/Financial/FeeTypes/hooks/useFeeTypes";
import { getInstallmentAvailableAmount, isInstallmentPayable, usePaymentStore } from "@/features/Financial/Payment/store/paymentStore";
import { FeeTypeDialogContent } from "@/features/Financial/FeeTypes/components/FeeTypeDialog";
import { feesSchema } from "@/features/Financial/Fees/config/feeSchemas";
import { sortFeesByCategory } from "@/features/Financial/Fees/config/feeOrder";
import { FeeFactory, withFeeYear } from "@/features/Financial/Fees/utils/feeUtils";
import { useActiveAcademicYear } from "@/features/Settings/hooks/useSettings";
import { useSetViewingYear, useViewingAcademicYear } from "@/features/AcademicYears/hooks/useViewingAcademicYear";
import { hasFailedToLoad, isAuthorizationError } from "@/services/apiError";

const TAB_STYLES = "border-0 cursor-pointer data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:!border-b-2 data-[state=active]:!border-primary rounded-none px-6 py-3 data-[state=active]:!text-primary text-muted-foreground hover:text-primary transition-colors";

const getFeeBalance = (fee: any) => {
  const explicitBalance = Number(fee?.balance ?? fee?.totalDue ?? fee?.dueAmount);
  if (Number.isFinite(explicitBalance)) return explicitBalance;

  const netAmount = Number(fee?.netAmount ?? 0);
  const paidAmount = Number(fee?.paidAmount ?? fee?.totalPaid ?? 0);
  return Math.max(netAmount - paidAmount, 0);
};

const SelectStudentFeeTypes = ({ feeTypes, onAdd }: {
  feeTypes: any[];
  onAdd: (selectedIds: string[]) => Promise<void>;
}) => {
  const { t } = useTranslation();
  const dialogStore = useDialogStore();
  const dialogId = useRef(dialogStore.getState().getCurrentDialog()?.id);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const close = () => {
    if (dialogId.current) dialogStore.getState().closeDialog(dialogId.current);
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0 || isSaving) return;
    setIsSaving(true);
    setSubmitError(null);

    try {
      await onAdd(selectedIds);
      close();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('common.feedback.errorTitle'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={isSaving ? 'pointer-events-none opacity-60' : undefined} aria-busy={isSaving}>
        <FeeTypeDialogContent
          feeTypes={feeTypes}
          initialSelectedIds={[]}
          onSelectionChange={setSelectedIds}
        />
      </div>
      {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
      <div className="flex justify-end gap-2">
        <NButton variant="outline" disabled={isSaving} onClick={close}>
          {t('common.cancel')}
        </NButton>
        <NButton disabled={selectedIds.length === 0 || isSaving} loading={isSaving} onClick={handleAdd}>
          {t('fees.studentView.addFees')}
        </NButton>
      </div>
    </div>
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
  const { t } = useTranslation();
  const { viewingYear } = useViewingAcademicYear();
  const setViewingYear = useSetViewingYear();
  // The viewed year's fees, with the totals and payment metrics the server
  // computes for that fee year, and every year's fees for other years'
  // unpaid balances.
  const {
    studentFees,
    studentFeesError,
    isStudentFeesLoading,
    studentAllYearFees,
    createBulkFees,
  } = useFees({ studentId, studentAllYears: true, enabled: false });
  const { isAcademicYearLoading } = useActiveAcademicYear();
  const { createPayment } = usePayments();
  const { feeTypes } = useFeeTypes();
  const [selectedFeeId, setSelectedFeeId] = useState(initialFeeId);
  const [activeTab, setActiveTab] = useState("overview");
  // The server has already limited the fees to the viewed year. The cards,
  // and the fee selected by default, follow the category display order.
  const visibleFees = useMemo(() => sortFeesByCategory<any>(studentFees?.fees || []), [studentFees?.fees]);
  // Other years' unpaid fees stay reachable without entering this year's
  // fees or totals.
  const otherYearDebts = useMemo(() => {
    if (!viewingYear) return [];
    const unpaidByYear = new Map<string, number>();
    for (const fee of studentAllYearFees?.fees || []) {
      if (fee.academicYear && fee.academicYear !== viewingYear && getFeeBalance(fee) > 0) {
        unpaidByYear.set(fee.academicYear, (unpaidByYear.get(fee.academicYear) ?? 0) + 1);
      }
    }
    return [...unpaidByYear]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([year, count]) => ({ year, count }));
  }, [viewingYear, studentAllYearFees?.fees]);
  const visibleStudentFees = useMemo(() => studentFees ? { ...studentFees, fees: visibleFees } : null, [studentFees, visibleFees]);
  const overdueCount = visibleFees.reduce((sum: number, fee: any) => sum + Number(fee.overdueInstallments || 0), 0);
  const visibleAlerts = {
    hasOverdueFees: overdueCount > 0,
    overdueCount,
    message: overdueCount > 0 ? t('fees.studentView.overdue', { count: overdueCount }) : '',
  };
  const { openDialog } = useDialog();
  const resetPayment = usePaymentStore((state) => state.reset);
  const selectInstallments = usePaymentStore((state) => state.selectInstallments);
  const setPaymentDetails = usePaymentStore((state) => state.setPaymentDetails);
  const loadingClassName = hideHeader ? 'min-h-64' : 'min-h-[calc(100vh-12rem)]';
  // Select the first fee in the same render as the loaded data. Waiting for an
  // effect first mounts the cards without the installment table, then changes
  // the height that NTable measures for its automatic page size.
  const selectedFee = visibleFees.find((fee: any) => fee.id === selectedFeeId)
    || visibleFees[0]
    || null;
  const hasPayableBalance = Boolean(
    visibleFees.some((fee: any) => getFeeBalance(fee) > 0)
  );
  // New fees are charged to the viewed year, so a type is addable once per that year.
  const feeYear = viewingYear;
  const addableFeeTypes = useMemo(() => {
    const assignedFeeTypeIds = new Set(
      (studentFees?.fees || []).filter((fee: any) => fee.academicYear === feeYear)
        .map((fee: any) => fee?.feeTypeId)
        .filter(Boolean)
    );

    return (feeTypes || []).filter((feeType: any) => !assignedFeeTypeIds.has(feeType.id));
  }, [feeYear, feeTypes, studentFees?.fees]);

  useEffect(() => {
    if (initialFeeId) {
      setSelectedFeeId(initialFeeId);
    }
  }, [initialFeeId]);

  const handleFeeClick = (fee) => {
    setSelectedFeeId(selectedFee?.id === fee.id ? null : fee.id);
  };

  const handleAddFee = () => {
    openDialog({
      title: t('fees.form.selectFeeTypes'),
      children: (
        <SelectStudentFeeTypes
          feeTypes={addableFeeTypes}
          onAdd={async (selectedIds) => {
            const { fees } = feesSchema.parse(withFeeYear({
              fees: addableFeeTypes
                .filter((feeType) => selectedIds.includes(feeType.id))
                .map((feeType) => ({
                  ...FeeFactory.createFromFeeType(feeType),
                  baseAmount: Number(feeType.amount),
                })),
            }, viewingYear));

            await createBulkFees({ fees: fees.map((fee) => ({ ...fee, studentId })) });
          }}
        />
      ),
      width: '5xl',
      height: 'auto',
      showButtons: false,
    });
  };

  const decorateInstallmentsForPayment = useCallback((fee: any, installments: any[]) => {
    return (installments || []).map((installment: any) => ({
      ...installment,
      feeId: fee.id,
      feeIcon: fee.icon,
      feeColor: fee.color,
      feeName: fee.name,
    }));
  }, []);

  const buildPaymentTarget = useCallback((target?: { fee?: any; installment?: any }) => {
    const hasScopedTarget = Boolean(target?.fee || target?.installment);

    if (!visibleStudentFees || !hasScopedTarget) {
      return {
        paymentStudentFees: visibleStudentFees,
        selectedTargets: [],
      };
    }

    const sourceFee = target?.fee || visibleFees.find((fee: any) =>
      fee.installments?.some((installment: any) => installment.id === target?.installment?.id)
    );

    if (!sourceFee) {
      return {
        paymentStudentFees: visibleStudentFees,
        selectedTargets: [],
      };
    }

    const scopedInstallments = target?.installment
      ? sourceFee.installments?.filter((installment: any) => installment.id === target.installment.id)
      : sourceFee.installments;

    const paymentStudentFees = {
      ...visibleStudentFees,
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
  }, [decorateInstallmentsForPayment, visibleFees, visibleStudentFees]);

  const handlePayClick = async (target?: { fee?: any; installment?: any }) => {
    if (!visibleStudentFees) return;

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
        const response = await createPayment(paymentData);
        const payment = response?.data;
        if (payment?.id) {
          openDialog({
            title: t('payments.dialogs.recordedTitle'),
            children: <PaymentRecordedPrompt payment={payment} student={visibleStudentFees.student} />,
            showButtons: false,
          });
        }
      }
    } finally {
      resetPayment();
    }
  };

  if (isStudentFeesLoading || isAcademicYearLoading) {
    return <StudentFeesViewSkeleton className={loadingClassName} hideHeader={hideHeader} />;
  }

  // A refused or failed read is not a student without fees.
  if (hasFailedToLoad(studentFeesError, studentFees?.fees)) {
    return isAuthorizationError(studentFeesError)
      ? <NForbiddenState surface="panel" />
      : <NErrorState surface="panel" />;
  }

  if (!studentFees) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">{t('fees.studentView.noData')}</p>
      </div>
    );
  }

  const tabConfig = [
    {
      value: "overview",
      label: t('fees.studentView.overview'),
      icon: Receipt,
      content: (
        <FeesOverview
          fees={visibleFees}
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
      label: t('fees.studentView.discounts'),
      icon: Tag,
      content: <DiscountsTab fees={visibleFees} studentId={studentId} />,
    },
    {
      value: "history",
      label: t('fees.studentView.history'),
      icon: History,
      content: <PaymentHistory studentId={studentId} studentFees={studentAllYearFees} />,
    },
    {
      value: "documents",
      label: t('fees.studentView.documents'),
      icon: FileText,
      content: <Documents studentId={studentId} />,
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {!hideHeader && (
        <StudentHeader
          studentFees={{ ...visibleStudentFees, alerts: visibleAlerts }}
          onPayClick={() => handlePayClick()}
          payDisabled={!hasPayableBalance}
        />
      )}

      {otherYearDebts.length > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
        >
          <span className="font-medium">{t('fees.historyView.otherYearDebts')}</span>
          {otherYearDebts.map(({ year, count }) => (
            <button
              key={year}
              type="button"
              onClick={() => setViewingYear(year)}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {t('fees.historyView.otherYearDebt', { year, count })}
            </button>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200">
          <TabsList className="max-w-full overflow-x-auto bg-transparent rounded-none justify-start h-auto p-0 border-0">
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
                  {t('fees.studentView.addFees')}
                </NButton>
              )}

              {hideHeader && (
                <>
                  {visibleAlerts.hasOverdueFees && (
                    <div className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/20 rounded-full px-3 py-1">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full" />
                      <span className="text-xs font-medium text-destructive">
                        {visibleAlerts.message}
                      </span>
                    </div>
                  )}
                  <NButton
                    onClick={() => handlePayClick()}
                    disabled={!hasPayableBalance}
                    title={!hasPayableBalance ? t('fees.studentView.nothingToPay') : undefined}
                    size="sm"
                    className="px-5 font-semibold"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t('fees.studentView.pay')}
                  </NButton>
                </>
              )}
            </div>
          )}
        </div>

        {tabConfig.map(({ value, content }) => (
          <TabsContent
            key={value}
            value={value}
            className={value === 'overview'
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'min-h-0 flex-1 overflow-y-auto'}
          >
            {content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
