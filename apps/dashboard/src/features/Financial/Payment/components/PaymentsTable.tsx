"use client"


import { PermissionButton } from '@/components/PermissionButton';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { NButton, NEmptyState, NErrorState, NForbiddenState } from 'najm-kit';
import { hasFailedToLoad, isAuthorizationError } from '@/services/apiError';
import { useDialog } from '@/shared/useDialog';
import { SchoolTable as NTable } from '@/components/SchoolTable';
import { usePayments } from '../hooks/usePayments';
import { useTranslation } from 'najm-i18n/react';
import PaymentCard from './PaymentCard';
import PaymentEditForm from './PaymentEditForm';
import CheckReasonForm, { CHECK_REASON_FORM_ID } from '@/features/Financial/Operations/components/CheckReasonForm';
import { PaymentRecordedPrompt } from './ReceiptPrint/PaymentRecordedPrompt';
import { usePaymentsTableColumns } from '../hooks/usePaymentsTableColumns';
import { usePaymentsTableFilters } from '../hooks/usePaymentsTableFilters';
import { usePrintReceipt } from './ReceiptPrint/usePrintReceipt';
import { Printer, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { updateCheckStatusApi, voidPaymentApi } from '@/services/paymentApi';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';


function PaymentsTable({studentId}) {
  const { t } = useTranslation();
  const { currency } = useSchoolFormat();
  const { printReceipt, isReceiptLoading } = usePrintReceipt();
  const { viewingYear } = useViewingAcademicYear();
  // The per-student history includes every year. Only the school-wide list
  // returns the portion of each receipt allocated to a selected fee year.
  const feeYear = studentId ? undefined : viewingYear;
  const columns = usePaymentsTableColumns(feeYear);
  const rawFilters = usePaymentsTableFilters();

  const {
    payments,
    studentPayments,
    isPaymentsLoading,
    isStudentPaymentsLoading,
    error: paymentsError,
    studentPaymentsError,
    isUpdating,
    updatePayment,
  } = usePayments({ studentId, enabled: !studentId });
  const queryClient = useQueryClient();

  const { openDialog, pop } = useDialog();

  const data = studentId ? studentPayments : payments;
  const isLoading = studentId ? isStudentPaymentsLoading : isPaymentsLoading;
  const error = studentId ? studentPaymentsError : paymentsError;

  const handlePrint = (payment) => {
    printReceipt({
      paymentId: payment.id,
      receiptNumber: payment.receiptNumber ?? payment.id,
      paymentDate: payment.paymentDate,
      studentName: payment.student?.name ?? '',
      studentCode: payment.student?.studentCode ?? '',
      amount: Number(payment.amount),
      feeYear,
      yearAllocatedAmount: feeYear ? Number(payment.yearAllocatedAmount) : undefined,
      currency,
      paymentMethod: payment.paymentMethod,
      transactionRef: payment.transactionRef ?? undefined,
      checkNumber: payment.checkNumber ?? undefined,
      notes: payment.notes ?? undefined,
    });
  };

  // As on the cheques page: a refusal is shown rather than escaping as an
  // unhandled rejection, and the check status reads in the page language.
  // The action changes this history, the balances and the installments; the
  // hook's `refetch` reloads only the school-wide list.
  const runAction = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      await Promise.all(['payments', 'fees', 'installments'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      toast.success(success);
    } catch (actionError: any) {
      toast.error(actionError?.message || t('financialOperations.failed'));
    }
  };

  // The reason form the cheques page uses; the browser's prompt was English
  // chrome, unstyled and unreachable on some phones.
  const askReason = (payment, kind: 'bounce' | 'void') => openDialog({
    title: t(kind === 'bounce' ? 'financialOperations.bounceTitle' : 'payments.dialogs.voidPayment'),
    description: [payment.receiptNumber, payment.checkNumber].filter(Boolean).join(' · '),
    children: <CheckReasonForm label={t(kind === 'bounce' ? 'financialOperations.bounceReason' : 'financialOperations.voidReason')} />,
    width: 'md',
    primaryButton: {
      form: CHECK_REASON_FORM_ID,
      text: t(kind === 'bounce' ? 'financialOperations.bounce' : 'payments.dialogs.voidPayment'),
      variant: 'destructive',
      onClick: ({ reason }: { reason: string }) => kind === 'bounce'
        ? runAction(() => updateCheckStatusApi(payment.id, { status: 'bounced', reason }),
          t('payments.success.checkMarked', { status: t('financialOperations.checkStatuses.bounced') }))
        : runAction(() => voidPaymentApi(payment.id, reason), t('payments.success.voided')),
    },
    secondaryButton: { text: t('common.cancel') },
  });

  const handleView = (payment) => {
    // Each action closes this view first: it shows the status it was opened with.
    const updateCheck = async (status) => {
      await pop();
      if (status === 'bounced') return askReason(payment, 'bounce');
      await runAction(
        () => updateCheckStatusApi(payment.id, { status }),
        t('payments.success.checkMarked', { status: t(`financialOperations.checkStatuses.${status}`) }),
      );
    };

    const voidPayment = async () => {
      await pop();
      return askReason(payment, 'void');
    };

    openDialog({
      title: t('payments.dialogs.viewTitle'),
      children: (
        <div className="flex flex-col gap-4">
          <PaymentCard data={payment} feeYear={feeYear} />
          {payment.status === 'completed' && (
            <NButton
              variant="outline"
              size="sm"
              onClick={() => handlePrint(payment)}
              disabled={isReceiptLoading}
              className="gap-2 self-start"
            >
              <Printer className="w-4 h-4" />
              {t('payments.dialogs.printReceipt')}
            </NButton>
          )}
          {payment.paymentMethod === 'check' && ['pending', 'deposited', 'completed'].includes(payment.status) && (
            <div className="flex flex-wrap gap-2">
              {payment.status === 'pending' && (
                <PermissionButton permission="update:payments" size="sm" onClick={() => updateCheck('deposited')}>{t('payments.dialogs.depositCheck')}</PermissionButton>
              )}
              {payment.status === 'deposited' && (
                <PermissionButton permission="update:payments" size="sm" onClick={() => updateCheck('completed')}>{t('payments.dialogs.completeCheck')}</PermissionButton>
              )}
              <PermissionButton permission="update:payments" variant="outline" size="sm" onClick={() => updateCheck('bounced')}>{t('payments.dialogs.bounceCheck')}</PermissionButton>
              <PermissionButton permission="update:payments" variant="destructive" size="sm" onClick={voidPayment}>{t('payments.dialogs.voidPayment')}</PermissionButton>
            </div>
          )}
        </div>
      ),
      showButtons: false,
    });
  };

  const handleEdit = async (payment) => {
    let savedPayment: any;
    await openDialog({
      title: `${t('payments.dialogs.editTitle')} - ${payment.receiptNumber}`,
      children: <PaymentEditForm payment={payment} />,
      primaryButton: {
        form: 'payment-form',
        text: t('payments.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (paymentData) => {
          savedPayment = (await updatePayment(paymentData))?.data;
        }
      }
    });
    if (savedPayment?.id && savedPayment.id !== payment.id) {
      openDialog({
        title: t('payments.dialogs.recordedTitle'),
        children: <PaymentRecordedPrompt payment={savedPayment} student={payment.student} />,
        showButtons: false,
      });
    }
  };

  // A payment is never deleted: the row's delete voids it, with a reason.
  const handleDelete = (payment) => askReason(payment, 'void');

  return (
    <NTable
        permissionResource="payments"
      deletePermission="update:payments"
      data={data || []}
      columns={columns}
      filters={rawFilters}
      onView={handleView}
      onEdit={handleEdit}
      onDelete={handleDelete}
      loading={isLoading}
      error={hasFailedToLoad(error, data) ? error : null}
      renderError={(currentError) => (
        isAuthorizationError(currentError)
          ? <NForbiddenState surface="panel" />
          : <NErrorState surface="panel" />
      )}
      renderCard={(props: any) => <PaymentCard {...props} feeYear={feeYear} />}
      renderEmpty={() => (
        <NEmptyState
          surface="panel"
          icon={FEATURE_ICONS.payments}
          title={t('emptyStates.payments.title')}
          description={t('emptyStates.payments.description')}
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
      loadingText={t('payments.table.loading') || 'Loading payments...'}
      defaultMode='table'
    />
  );
}

export default PaymentsTable;
