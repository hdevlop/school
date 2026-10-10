"use client"

import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { Calendar, DollarSign, TrendingUp, CheckCircle2 } from "lucide-react";
import { NStatCard, NStatCardSkeleton, NTableSkeleton } from 'najm-kit';
import PaymentsTable from "@/features/Financial/Payment/components/PaymentsTable";
import { useFees } from "../../../hooks/useFees";

interface PaymentHistoryProps {
  studentId: string;
  studentFees?: any;
}

export const PaymentHistory = ({ studentId, studentFees: initialStudentFees }: PaymentHistoryProps) => {
  const { t } = useTranslation();
  const { displayDateOnly, majorMoney } = useSchoolFormat();

  const shouldFetchStudentFees = !initialStudentFees && Boolean(studentId);
  const { studentFees: fetchedStudentFees, isStudentFeesLoading } = useFees({
    studentId,
    enabled: shouldFetchStudentFees,
  });
  const studentFees = initialStudentFees ?? fetchedStudentFees;

  const summary = studentFees?.summary || {};

  if (shouldFetchStudentFees && isStudentFeesLoading) {
    return (
      <div className="flex min-h-64 flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <NStatCardSkeleton key={index} />
          ))}
        </div>
        <div className="rounded-lg border border-border bg-card">
          <NTableSkeleton rows={5} columns={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <NStatCard
          icon={DollarSign}
          label={t('fees.studentView.totalPaid')}
          value={majorMoney(summary.totalPaid)}
        />


        <NStatCard
          icon={DollarSign}
          label={t('fees.studentView.totalDue')}
          value={majorMoney(summary.totalDue)}
        />

        <NStatCard
          icon={CheckCircle2}
          label={t('fees.studentView.paymentsCount')}
          value={summary.paidCount}
        />

        <NStatCard
          icon={Calendar}
          label={t('fees.studentView.lastPayment')}
          value={summary.lastPayment ? displayDateOnly(summary.lastPayment) : t('fees.studentView.noPayments')}
        />

        <NStatCard
          icon={TrendingUp}
          label={t('fees.studentView.averagePayment')}
          value={majorMoney(summary.avgPaymentAmount)}
        />
      </div>

      {/* Payment Table */}
      <div className="flex flex-col gap-3 h-full">
        <PaymentsTable studentId={studentId} />
      </div>
    </div>
  );
};
