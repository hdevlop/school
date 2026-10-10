'use client';

import Link from 'next/link';
import { BriefcaseBusiness, CheckCircle2, Clock, HandCoins, Timer, Undo2 } from 'lucide-react';
import { Badge, NAvatar, NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { getStaffAvatar } from '@/features/Staff/utils/staffAvatar';

export type PayrollRow = {
  id: string;
  payslipId: string | null;
  staffId: string;
  name: string;
  role?: string | null;
  gender?: string | null;
  image?: string | null;
  updatedAt?: string | null;
  contractType: string;
  payrollPeriod: string;
  paymentAmount: number;
  paymentStatus: string;
  payslipNumber: string | null;
  teacherId: string | null;
};

export function PayrollTypeBadge({ type }: { type: string }) {
  const { t } = useTranslation();
  const isVacataire = type === 'vacataire';
  const Icon = isVacataire ? Timer : BriefcaseBusiness;
  return (
    <Badge className={isVacataire ? 'gap-1 border-transparent bg-sky-600 text-white shadow-sm' : 'gap-1 border-transparent bg-emerald-600 text-white shadow-sm'}>
      <Icon className="h-3 w-3" />
      {isVacataire ? t('payroll.types.vacataire') : t('payroll.types.permanent')}
    </Badge>
  );
}

export function PayrollStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  if (status === 'paid') {
    return (
      <Badge className="gap-1 border-transparent bg-emerald-600 text-white shadow-sm">
        <CheckCircle2 className="h-3 w-3" />
        {t('payroll.status.paid')}
      </Badge>
    );
  }

  if (status === 'pending') {
    return (
      <Badge className="gap-1 border-transparent bg-amber-500 text-amber-950 shadow-sm">
        <Clock className="h-3 w-3" />
        {t('payroll.status.pending')}
      </Badge>
    );
  }

  return (
    <Badge className="border-transparent bg-slate-600 text-white shadow-sm">
      {t('payroll.status.notSet')}
    </Badge>
  );
}

/** The staff member's avatar, opening the profile when they are a teacher. */
export function PayrollStaff({ row }: { row: PayrollRow }) {
  const avatar = (
    <NAvatar
      src={row.image || getStaffAvatar(row.role, row.gender)}
      title={row.name || '-'}
      size="sm"
      version={row.updatedAt}
    />
  );
  // Only teachers have a profile page to open.
  if (!row.teacherId) return avatar;
  return (
    <Link
      href={`/teachers/${row.teacherId}`}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex min-w-0 rounded-md hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {avatar}
    </Link>
  );
}

interface Props {
  data: PayrollRow;
  isPaying: boolean;
  onPay: (staffId: string) => void;
  onUnpay: (staffId: string) => void;
}

/** One staff member's pay for the period at phone width, where the table did not fit. */
export default function PayrollCard({ data: row, isPaying, onPay, onUnpay }: Props) {
  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();
  const isPaid = row.paymentStatus === 'paid';

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <PayrollStaff row={row} />
        </div>
        <PayrollTypeBadge type={row.contractType} />
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-col items-start gap-1">
          <span className="font-semibold tabular-nums text-foreground">{majorMoney(row.paymentAmount)}</span>
          <PayrollStatusBadge status={row.paymentStatus} />
        </div>
        <NButton
          size="sm"
          variant={isPaid ? 'outline' : 'default'}
          disabled={isPaying}
          onClick={(event) => {
            // The card itself selects the row; the button only pays.
            event.stopPropagation();
            if (isPaid) onUnpay(row.staffId);
            else onPay(row.staffId);
          }}
          className="shrink-0 gap-1"
        >
          {isPaid ? <Undo2 className="h-4 w-4" /> : <HandCoins className="h-4 w-4" />}
          {isPaid ? t('payroll.actions.unpay') : t('payroll.actions.pay')}
        </NButton>
      </div>
    </div>
  );
}
