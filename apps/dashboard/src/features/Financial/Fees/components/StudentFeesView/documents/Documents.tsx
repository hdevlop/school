"use client"

import { NajmScroll, NButton, NSkeleton } from 'najm-kit';

import { FileText, Printer } from "lucide-react";
import { usePayments } from "@/features/Financial/Payment/hooks/usePayments";
import { printReceipt } from "@/features/Financial/Payment/components/ReceiptPrint/printReceipt";
import { formatDate } from "@/lib/utils";

export const Documents = ({ studentId }) => {
  const { studentPayments, isStudentPaymentsLoading } = usePayments({ studentId });

  const payments = Array.isArray(studentPayments) ? studentPayments : [];
  const completedPayments = payments.filter((p) => p.status === 'completed');

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

  if (isStudentPaymentsLoading) {
    return (
      <div className="flex h-[calc(100vh-180px)] min-h-[280px] flex-col rounded-lg border bg-card">
        <div className="shrink-0 border-b border-gray-200 p-4">
          <NSkeleton className="h-6 w-44" />
          <NSkeleton className="mt-2 h-4 w-36" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <NSkeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <NSkeleton className="h-4 w-44" />
                  <NSkeleton className="h-3 w-32" />
                </div>
              </div>
              <NSkeleton className="h-9 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[280px] flex-col rounded-lg border bg-card">
      <div className="shrink-0 border-b border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-800">Reçus de paiement</h3>
        <p className="text-sm text-gray-600 mt-1">
          {completedPayments.length} reçu{completedPayments.length !== 1 ? 's' : ''} disponible{completedPayments.length !== 1 ? 's' : ''}
        </p>
      </div>

      <NajmScroll axis="y" className="min-h-0 flex-1">
        {completedPayments.length === 0 ? (
          <div className="p-4">
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun reçu disponible</p>
              <p className="text-sm text-gray-400 mt-1">Les reçus apparaissent après validation du paiement.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {completedPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Reçu N° {payment.receiptNumber ?? payment.id}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(payment.paymentDate)} &nbsp;·&nbsp;{' '}
                      {Number(payment.amount).toLocaleString('fr-MA')} MAD
                    </p>
                  </div>
                </div>
                <NButton
                  size="sm"
                  variant="outline"
                  onClick={() => handlePrint(payment)}
                  className="gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Imprimer
                </NButton>
              </div>
            ))}
          </div>
        )}
      </NajmScroll>
    </div>
  );
};
