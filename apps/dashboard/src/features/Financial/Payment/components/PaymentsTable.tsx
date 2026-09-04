"use client"

import { NTable, NButton } from 'najm-kit';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { usePayments } from '../hooks/usePayments';
import { useTranslation } from 'najm-i18n/react';
import PaymentCard from './PaymentCard';
import PaymentEditForm from './PaymentEditForm';import { usePaymentsTableColumns } from '../hooks/usePaymentsTableColumns';
import { usePaymentsTableFilters } from '../hooks/usePaymentsTableFilters';
import { printReceipt } from './ReceiptPrint/printReceipt';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { updateCheckStatusApi, voidPaymentApi } from '@/services/paymentApi';


function PaymentsTable({studentId}) {
  const { t } = useTranslation();
  const columns = usePaymentsTableColumns();
  const rawFilters = usePaymentsTableFilters();

  const {
    payments,
    studentPayments,
    isPaymentsLoading,
    isStudentPaymentsLoading,
    isUpdating,
    updatePayment,
    refetch,
  } = usePayments({ studentId });

  const { openDialog, confirmDelete } = useConfirmDelete();

  const data = studentId ? studentPayments : payments;
  const isLoading = studentId ? isStudentPaymentsLoading : isPaymentsLoading;

  const handlePrint = (payment) => {
    printReceipt({
      receiptNumber: payment.receiptNumber ?? payment.id,
      paymentDate: payment.paymentDate,
      studentName: payment.student?.name ?? '',
      studentCode: payment.student?.studentCode ?? '',
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      transactionRef: payment.transactionRef ?? undefined,
      checkNumber: payment.checkNumber ?? undefined,
      notes: payment.notes ?? undefined,
      processedBy: payment.processor?.email ?? undefined,
    });
  };

  const handleView = (payment) => {
    const updateCheck = async (status) => {
      const reason = status === 'bounced' ? window.prompt('Reason for bounced check') : undefined;
      if (status === 'bounced' && !reason) return;
      await updateCheckStatusApi(payment.id, { status, reason });
      await refetch();
      toast.success(t('payments.success.checkMarked', { status }));
    };

    const voidPayment = async () => {
      const reason = window.prompt('Reason for voiding this payment');
      if (!reason) return;
      await voidPaymentApi(payment.id, reason);
      await refetch();
      toast.success(t('payments.success.voided'));
    };

    openDialog({
      title: t('payments.dialogs.viewTitle'),
      children: (
        <div className="flex flex-col gap-4">
          <PaymentCard data={payment} />
          {payment.status === 'completed' && (
            <NButton
              variant="outline"
              size="sm"
              onClick={() => handlePrint(payment)}
              className="gap-2 self-start"
            >
              <Printer className="w-4 h-4" />
              Imprimer le reçu
            </NButton>
          )}
          {payment.paymentMethod === 'check' && ['pending', 'deposited', 'completed'].includes(payment.status) && (
            <div className="flex flex-wrap gap-2">
              {payment.status === 'pending' && (
                <NButton size="sm" onClick={() => updateCheck('deposited')}>Deposit check</NButton>
              )}
              {payment.status === 'deposited' && (
                <NButton size="sm" onClick={() => updateCheck('completed')}>Complete check</NButton>
              )}
              <NButton variant="outline" size="sm" onClick={() => updateCheck('bounced')}>Bounce check</NButton>
              <NButton variant="destructive" size="sm" onClick={voidPayment}>Void payment</NButton>
            </div>
          )}
        </div>
      ),
      showButtons: false,
    });
  };

  const handleEdit = (payment) => {
    openDialog({
      title: `${t('expenses.dialogs.editTitle')} - ${payment.receiptNumber}`,
      children: <PaymentEditForm payment={payment} />,
      primaryButton: {
        form: 'payment-form',
        text: t('expenses.dialogs.updateButton'),
        loading: isUpdating,
        onClick: async (paymentData) => {
          await updatePayment(paymentData);
        }
      }
    }); 
  };

  const handleDelete = (payment) => {
    confirmDelete({
      itemName: payment.receiptNumber,
      confirmText: t('payments.dialogs.deleteButton'),
      onConfirm: async () => {
        const reason = window.prompt('Reason for voiding this payment');
        if (!reason) return;
        await voidPaymentApi(payment.id, reason);
        await refetch();
      }
    });
  };

  return (
    <NTable
      data={data || []}
      columns={columns}
      filters={rawFilters}
      onView={handleView}
      onEdit={handleEdit}
      onDelete={handleDelete}
      loading={isLoading}
      renderCard={PaymentCard}
      noDataText={t('payments.table.noPayments') || 'No payments found'}
      loadingText={t('payments.table.loading') || 'Loading payments...'}
      defaultMode='table'
    />
  );
}

export default PaymentsTable;
