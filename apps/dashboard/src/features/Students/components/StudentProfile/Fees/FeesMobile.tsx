'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleDollarSign, FileText } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { NCard, NErrorState, NForbiddenState } from 'najm-kit';
import { useFees } from '@/features/Financial/Fees/hooks/useFees';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { useBusinessDate } from '@/features/Settings/hooks/useSettings';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { isAuthorizationError } from '@/services/apiError';
import {
  BalanceCard,
  FeeInstallmentsCard,
  FeesTabSkeleton,
  NextDueBanner,
  OverdueBanner,
  SettledBanner,
  type ProfileFee,
  type ProfileInstallment,
} from './FeeCards';

interface ProfileParent {
  name?: string | null;
  phone?: string | null;
  financialResponsibility?: boolean | null;
}

export interface FeesTabProps {
  studentId?: string;
  student?: { name?: string };
  parents?: ProfileParent[];
  // The students list's profile dialog closes itself first; without one, the
  // tab navigates to the fee record directly (the /students/:id page).
  onOpenFeeRecord?: (feeId?: string) => void;
}

const toNumber = (value: unknown) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const byDueDate = (a: { dueDate?: string }, b: { dueDate?: string }) =>
  String(a.dueDate ?? '').localeCompare(String(b.dueDate ?? ''));

/** Whole days between two calendar dates (YYYY-MM-DD), never negative. */
const daysBetween = (from: string, to: string) => Math.max(0, Math.round(
  (Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / 86_400_000,
));

/** A WhatsApp number from a stored phone: digits only, without an international 00. */
const whatsappNumber = (phone?: string | null) => {
  const digits = (phone ?? '').replace(/\D/g, '').replace(/^00/, '');
  return digits.length >= 8 ? digits : null;
};

function toProfileFee(fee: any): ProfileFee {
  const installments: ProfileInstallment[] = (Array.isArray(fee.installments) ? fee.installments : [])
    .filter((installment: any) => installment?.status !== 'cancelled')
    .map((installment: any) => {
      const amount = toNumber(installment.amount);
      const paidAmount = toNumber(installment.paidAmount);
      return { ...installment, amount, paidAmount, remaining: Math.max(amount - paidAmount, 0) };
    })
    .sort(byDueDate);
  const overdue = installments.filter((installment) => installment.isOverdue && installment.remaining > 0);
  const netAmount = toNumber(fee.netAmount) || installments.reduce((sum, item) => sum + item.amount, 0);
  const paidAmount = toNumber(fee.paidAmount) || installments.reduce((sum, item) => sum + item.paidAmount, 0);

  return {
    id: fee.id,
    name: fee.name,
    icon: fee.icon,
    image: fee.image ?? fee.feeType?.image,
    type: fee.type ?? fee.feeTypeCategory ?? fee.category ?? fee.feeType?.category,
    installments,
    netAmount,
    paidAmount,
    remaining: Math.max(toNumber(fee.balance ?? fee.totalDue ?? fee.dueAmount) || netAmount - paidAmount, 0),
    overdueAmount: overdue.reduce((sum, item) => sum + item.remaining, 0),
    overdueCount: overdue.length,
  };
}

/**
 * The student's fees to read at a glance: what is left to pay, what is late
 * (with a reminder to the parent), then each fee opening onto its installments.
 * Payments are taken in the fee record, which every fee links to. Phones and tablets.
 */
export default function FeesMobile({ studentId, student, parents, onOpenFeeRecord }: FeesTabProps) {
  const { majorMoney, displayDateOnly } = useSchoolFormat();
  const { t } = useTranslation();
  const router = useRouter();
  const { businessDate } = useBusinessDate();
  // The viewed year's fees, totals and installments; every year's with history off.
  const { viewingYear } = useViewingAcademicYear();
  const { studentFees, isStudentFeesLoading, studentFeesError } = useFees({ studentId, studentYear: viewingYear, enabled: false });

  const feeData = useMemo(() => {
    const fees = (Array.isArray(studentFees?.fees) ? studentFees.fees : []).map(toProfileFee)
      // Fees still owed first, the late ones on top; settled fees last.
      .sort((a, b) => Number(b.overdueCount > 0) - Number(a.overdueCount > 0) || Number(a.remaining <= 0) - Number(b.remaining <= 0));
    const summary = studentFees?.summary ?? {};
    const net = toNumber(summary.netAmount) || fees.reduce((sum, fee) => sum + fee.netAmount, 0);
    const paid = toNumber(summary.totalPaid) || fees.reduce((sum, fee) => sum + fee.paidAmount, 0);
    const due = toNumber(summary.totalDue) || Math.max(net - paid, 0);
    const owed = fees.flatMap((fee) => fee.installments).filter((installment) => installment.remaining > 0).sort(byDueDate);
    const overdue = owed.filter((installment) => installment.isOverdue);

    return {
      fees,
      lastPayment: summary.lastPayment as string | undefined,
      net,
      paid,
      due,
      overdueAmount: overdue.reduce((sum, installment) => sum + installment.remaining, 0),
      overdueCount: overdue.length,
      oldestOverdue: overdue[0]?.dueDate,
      nextDue: owed.find((installment) => !installment.isOverdue),
    };
  }, [studentFees]);

  // The first late fee starts open (or the first one still owed); the reader opens the others.
  const defaultOpen = useMemo(() => {
    const first = feeData.fees.find((fee) => fee.overdueCount > 0) ?? feeData.fees.find((fee) => fee.remaining > 0);
    return new Set(first ? [first.id] : []);
  }, [feeData.fees]);
  const [openIds, setOpenIds] = useState<Set<string> | null>(null);
  const open = openIds ?? defaultOpen;
  const toggle = useCallback((id: string) => setOpenIds((current) => {
    const next = new Set(current ?? defaultOpen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }), [defaultOpen]);

  const openFeeRecord = useCallback((feeId?: string) => {
    if (onOpenFeeRecord) return onOpenFeeRecord(feeId);
    if (!studentId) return;
    const query = feeId ? `?feeId=${encodeURIComponent(feeId)}` : '';
    router.push(`/students/${studentId}/fees${query}`);
  }, [onOpenFeeRecord, router, studentId]);

  // The reminder goes to the parent who pays, or else the first one with a phone.
  const contact = parents?.find((parent) => parent.financialResponsibility && whatsappNumber(parent.phone))
    ?? parents?.find((parent) => whatsappNumber(parent.phone));
  const contactNumber = whatsappNumber(contact?.phone);
  // The stored number as dialled: digits and a leading +.
  const callHref = contactNumber && feeData.overdueCount > 0 ? `tel:${(contact?.phone ?? '').replace(/[^\d+]/g, '')}` : null;
  const remindHref = contactNumber && feeData.overdueCount > 0
    ? `https://wa.me/${contactNumber}?text=${encodeURIComponent(t('students.profile.feeDetails.reminderMessage', {
      parent: contact?.name ?? '',
      count: feeData.overdueCount,
      student: student?.name ?? '',
      amount: majorMoney(feeData.overdueAmount),
    }))}`
    : null;

  if (!studentId) {
    return (
      <NCard className="p-8 text-center text-sm font-medium text-muted-foreground">
        {t('students.profile.feeDetails.studentIdRequired')}
      </NCard>
    );
  }

  if (isStudentFeesLoading) return <FeesTabSkeleton />;

  // A failed read is not "no fees": saying so would invite assigning them again.
  if (studentFeesError && !studentFees) {
    return isAuthorizationError(studentFeesError) ? <NForbiddenState surface="panel" /> : <NErrorState surface="panel" />;
  }

  if (feeData.fees.length === 0) {
    return (
      <NCard className="flex flex-col items-center justify-center px-4 py-14 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CircleDollarSign className="size-6" />
        </div>
        <p className="font-bold text-foreground">{t('students.profile.feeDetails.noneAssigned')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('students.profile.feeDetails.noneAssignedHelp')}</p>
        <Link
          href={`/students/${studentId}/fees`}
          className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <FileText className="size-4" />
          {t('students.profile.feeDetails.openRecord')}
        </Link>
      </NCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <BalanceCard net={feeData.net} paid={feeData.paid} due={feeData.due} overdue={feeData.overdueAmount} />
        {feeData.overdueCount > 0 && feeData.oldestOverdue ? (
          <OverdueBanner
            count={feeData.overdueCount}
            amount={feeData.overdueAmount}
            since={feeData.oldestOverdue}
            days={daysBetween(feeData.oldestOverdue, businessDate)}
            callHref={callHref}
            callHint={contact?.name ? t('students.profile.feeDetails.callHint', { name: contact.name }) : undefined}
            remindHref={remindHref}
            remindHint={contact?.name ? t('students.profile.feeDetails.remindHint', { name: contact.name }) : undefined}
          />
        ) : feeData.nextDue ? (
          <NextDueBanner date={feeData.nextDue.dueDate} amount={feeData.nextDue.remaining} />
        ) : feeData.due <= 0 ? (
          <SettledBanner />
        ) : null}
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-bold text-foreground">{t('students.profile.feeDetails.assignedFees')}</h3>
          {feeData.lastPayment ? (
            <span className="text-xs text-muted-foreground">
              {t('students.profile.feeDetails.lastPayment')} <span className="tabular-nums">{displayDateOnly(feeData.lastPayment)}</span>
            </span>
          ) : null}
        </div>
        <div className="grid items-start gap-3 lg:grid-cols-2">
          {feeData.fees.map((fee) => (
            <FeeInstallmentsCard
              key={fee.id}
              fee={fee}
              open={open.has(fee.id)}
              onToggle={() => toggle(fee.id)}
              onOpenRecord={() => openFeeRecord(fee.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
