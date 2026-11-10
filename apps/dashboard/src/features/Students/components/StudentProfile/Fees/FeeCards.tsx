'use client';

import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ChevronDown, Circle, CircleDot, Phone } from 'lucide-react';
import { WhatsAppIcon } from '@/shared/WhatsAppIcon';
import { cn, NBadge, NSkeleton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import FeeCategoryIcon from '@/features/Financial/Fees/components/FeeCategoryIcon';

export interface ProfileInstallment {
  id: string;
  number?: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  isOverdue?: boolean;
  status?: string;
}

export interface ProfileFee {
  id: string;
  name?: string;
  icon?: string | null;
  image?: string | null;
  type?: string | null;
  installments: ProfileInstallment[];
  netAmount: number;
  paidAmount: number;
  remaining: number;
  overdueAmount: number;
  overdueCount: number;
}

function LegendItem({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={cn('size-2 rounded-full', dot)} aria-hidden />
      {label}
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </span>
  );
}

const percentOf = (part: number, whole: number) => (whole > 0 ? Math.min(Math.max((part / whole) * 100, 0), 100) : 0);

/** The year's total as one bar: paid in green, then overdue in red, the rest still to come. */
function SplitBar({ paid, overdue, total }: { paid: number; overdue: number; total: number }) {
  const paidPct = percentOf(paid, total);
  const overduePct = Math.min(percentOf(overdue, total), 100 - paidPct);
  return (
    <div
      className="flex h-2 w-full overflow-hidden rounded-full bg-foreground/15"
      role="progressbar"
      aria-valuenow={Math.round(paidPct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full bg-emerald-500" style={{ width: `${paidPct}%` }} />
      <div className="h-full bg-red-500" style={{ width: `${overduePct}%` }} />
    </div>
  );
}

/** What is left to pay, and the year's total split into paid and overdue. */
export function BalanceCard({ net, paid, due, overdue }: { net: number; paid: number; due: number; overdue: number }) {
  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3">
      <div>
        <p className="text-xs text-muted-foreground">{t('students.profile.feeDetails.balanceDue')}</p>
        <p className="mt-1 text-lg font-bold leading-none tabular-nums text-foreground">{majorMoney(due)}</p>
      </div>
      <SplitBar paid={paid} overdue={overdue} total={net} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <LegendItem dot="bg-emerald-500" label={t('students.profile.feeDetails.paid')} value={majorMoney(paid)} />
        {overdue > 0 ? <LegendItem dot="bg-red-500" label={t('students.profile.feeDetails.overdue')} value={majorMoney(overdue)} /> : null}
        <span className="ms-auto whitespace-nowrap">
          {t('common.total')} <span className="font-semibold tabular-nums text-foreground">{majorMoney(net)}</span>
        </span>
      </div>
    </div>
  );
}

/** A banner beside the balance: the overdue installments, a calm next due date, or all settled. */
function Banner({ tone, icon: Icon, title, subtitle, action }: {
  tone: 'danger' | 'neutral' | 'success';
  icon: typeof AlertTriangle;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl border p-3',
        tone === 'danger' && 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
        tone === 'neutral' && 'border-border bg-card text-foreground',
        tone === 'success' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      )}
    >
      <Icon className={cn('size-4 shrink-0', tone === 'neutral' && 'text-amber-500')} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {subtitle ? <p className={cn('text-xs', tone === 'neutral' ? 'text-muted-foreground' : 'opacity-90')}>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** A thin round outline around a coloured icon. */
const CONTACT_BUTTON = 'inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-accent';

export function OverdueBanner({ count, amount, since, days, callHref, callHint, remindHref, remindHint }: {
  count: number;
  amount: number;
  since: string;
  days: number;
  callHref?: string | null;
  callHint?: string;
  remindHref?: string | null;
  remindHint?: string;
}) {
  const { t } = useTranslation();
  const { majorMoney, displayDateOnly } = useSchoolFormat();
  return (
    <Banner
      tone="danger"
      icon={AlertTriangle}
      title={t('students.profile.feeDetails.overdueAlert', { count, amount: majorMoney(amount) })}
      subtitle={t('students.profile.feeDetails.overdueSince', { date: displayDateOnly(since), count: days, plural: days > 1 ? 's' : '' })}
      action={callHref || remindHref ? (
        <div className="flex shrink-0 items-center gap-1">
          {callHref ? (
            <a href={callHref} title={callHint} aria-label={callHint} className={cn(CONTACT_BUTTON, 'text-sky-600 dark:text-sky-400')}>
              <Phone className="size-4" />
            </a>
          ) : null}
          {remindHref ? (
            // Opens WhatsApp with the reminder written out; the user still sends it.
            <a
              href={remindHref}
              target="_blank"
              rel="noopener noreferrer"
              title={remindHint}
              aria-label={remindHint}
              className={cn(CONTACT_BUTTON, 'text-[#25D366]')}
            >
              <WhatsAppIcon className="size-4.5" />
            </a>
          ) : null}
        </div>
      ) : null}
    />
  );
}

export function NextDueBanner({ date, amount }: { date: string; amount: number }) {
  const { t } = useTranslation();
  const { majorMoney, displayDateOnly } = useSchoolFormat();
  return (
    <Banner
      tone="neutral"
      icon={CalendarClock}
      title={t('students.profile.nextDue')}
      subtitle={<span className="tabular-nums">{displayDateOnly(date)} · {majorMoney(amount)}</span>}
    />
  );
}

export function SettledBanner() {
  const { t } = useTranslation();
  return <Banner tone="success" icon={CheckCircle2} title={t('students.profile.feeDetails.allSettled')} />;
}

function InstallmentLine({ installment }: { installment: ProfileInstallment }) {
  const { majorMoney, displayDate, displayDateOnly } = useSchoolFormat();
  const paid = installment.status === 'paid' || installment.remaining <= 0;
  const partial = !paid && installment.paidAmount > 0;
  const state = paid ? 'paid' : installment.isOverdue ? 'overdue' : partial ? 'partial' : 'pending';
  const Icon = { paid: CheckCircle2, overdue: AlertCircle, partial: CircleDot, pending: Circle }[state];
  const day = installment.dueDate?.slice(0, 10);

  return (
    <li className="flex items-center gap-3 px-3 py-2 text-xs">
      <Icon className={cn('size-4 shrink-0', {
        paid: 'text-emerald-500', overdue: 'text-red-500', partial: 'text-amber-500', pending: 'text-muted-foreground',
      }[state])} />
      <span className="min-w-0 flex-1 truncate font-medium capitalize text-foreground">{/* The full month: fr-MA shortens June and July to "jui." and "juil.". */}
        {day ? displayDate(day, { month: 'long' }) : '—'}</span>
      <span className="tabular-nums text-muted-foreground">{displayDateOnly(day)}</span>
      <span
        className={cn('min-w-20 whitespace-nowrap text-end tabular-nums', {
          paid: 'text-muted-foreground line-through',
          overdue: 'font-semibold text-red-600 dark:text-red-400',
          partial: 'font-semibold text-amber-600 dark:text-amber-400',
          pending: 'font-semibold text-foreground',
        }[state])}
      >
        {/* Paid shows what was due; otherwise what is still owed on it. */}
        {majorMoney(paid ? installment.amount : installment.remaining)}
      </span>
    </li>
  );
}

/** One fee: what is paid of its total, opening onto its installments month by month. */
export function FeeInstallmentsCard({ fee, open, onToggle, onOpenRecord }: {
  fee: ProfileFee;
  open: boolean;
  onToggle: () => void;
  onOpenRecord: () => void;
}) {
  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();
  const settled = fee.remaining <= 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full p-3 text-start">
        <span className="flex w-full items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FeeCategoryIcon image={fee.image} category={fee.type} fallback={fee.icon || '$'} size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{fee.name || t('students.profile.feeDetails.fee')}</span>
            <span className="block text-xs tabular-nums text-muted-foreground">
              {t('students.profile.feeDetails.installmentCount', { count: fee.installments.length })}
              {' · '}{majorMoney(fee.paidAmount)} / {majorMoney(fee.netAmount)}
            </span>
          </span>
          {fee.overdueCount > 0 ? (
            <NBadge color="destructive" look="soft" icon={AlertCircle} showIcon label={t('students.profile.feeDetails.overdueCount', { count: fee.overdueCount })} className="shrink-0" />
          ) : settled ? (
            <NBadge color="success" look="soft" icon={CheckCircle2} showIcon label={t('students.profile.feeDetails.settled')} className="shrink-0" />
          ) : null}
          <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {open ? (
        <>
          <ul className="divide-y divide-border border-t border-border">
            {fee.installments.map((installment) => <InstallmentLine key={installment.id} installment={installment} />)}
          </ul>
          <div className="border-t border-border px-3 py-2">
            <button type="button" onClick={onOpenRecord} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              {t('students.profile.feeDetails.openRecord')}
              <ArrowRight className="size-3.5 rtl:rotate-180" />
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function FeesTabSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <NSkeleton className="h-24 rounded-xl border border-border" />
        <NSkeleton className="h-24 rounded-xl border border-border" />
      </div>
      <NSkeleton className="h-5 w-40" />
      <div className="grid items-start gap-3 lg:grid-cols-2">
        <NSkeleton className="h-64 rounded-xl border border-border" />
        <NSkeleton className="h-20 rounded-xl border border-border" />
      </div>
    </div>
  );
}
