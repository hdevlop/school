"use client"

import { formatDate } from "@/lib/utils";
import { Calendar, DollarSign, TrendingUp, CheckCircle2 } from "lucide-react";
import { NStatCard, NStatCardSkeleton, NTableSkeleton } from 'najm-kit';
import PaymentsTable from "@/features/Financial/Payment/components/PaymentsTable";
import { useFees } from "../../../hooks/useFees";

interface PaymentHistoryProps {
  studentId: string;
  studentFees?: any;
}

export const PaymentHistory = ({ studentId, studentFees: initialStudentFees }: PaymentHistoryProps) => {

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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <NStatCard
          icon={DollarSign}
          label="Total Paid"
          value={`${summary.totalPaid} MAD`}
        />


        <NStatCard
          icon={DollarSign}
          label="Total Due"
          value={`${summary.totalDue} MAD`}
        />

        <NStatCard
          icon={CheckCircle2}
          label="Payments Count"
          value={summary.paidCount}
        />

        <NStatCard
          icon={Calendar}
          label="Last Payment"
          value={summary.lastPayment ? formatDate(summary.lastPayment) : "No payments"}
        />

        <NStatCard
          icon={TrendingUp}
          label="Avg. Payment"
          value={`${summary.avgPaymentAmount} MAD`}
        />
      </div>

      {/* Payment Table */}
      <div className="flex flex-col gap-3 h-full">
        <PaymentsTable studentId={studentId} />
      </div>
    </div>
  );
};
