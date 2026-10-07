"use client";

import { NBadge } from 'najm-kit';
import { CalendarClock } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { UPCOMING_STATUS_COLOR, displayInstallmentStatus } from '../config/installmentStatus';

/**
 * The View dialog of one installment: what the table row cannot show — how
 * much of it is paid, what is left, and what an uncleared payment holds.
 */
const InstallmentDetails = ({ installment }: { installment: any }) => {
  const { t } = useTranslation();
  const { displayDateOnly, majorMoney } = useSchoolFormat();

  const amount = Number(installment.amount || 0);
  const paid = Number(installment.paidAmount ?? installment.completedAmount ?? 0);
  const reserved = Number(installment.reservedAmount || 0);
  const remaining = Math.max(amount - paid, 0);
  const progress = amount > 0 ? Math.min(Math.round((paid / amount) * 100), 100) : 0;

  const figures = [
    { label: t('installments.table.amount'), value: majorMoney(amount), className: 'text-foreground' },
    { label: t('fees.table.paidAmount'), value: majorMoney(paid), className: 'text-green-600' },
    { label: t('fees.table.remainingAmount'), value: majorMoney(remaining), className: remaining > 0 ? 'text-destructive' : 'text-muted-foreground' },
  ];

  const details = [
    { label: t('installments.table.dueDate'), value: displayDateOnly(installment.dueDate) },
    { label: t('installments.table.paidDate'), value: installment.paidDate ? displayDateOnly(installment.paidDate) : '—' },
    ...(reserved > 0
      ? [{ label: t('installments.status.reserved'), value: majorMoney(reserved), hint: t('fees.studentView.reserved') }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <NBadge
        className="self-start"
        status={displayInstallmentStatus(installment.status)}
        statusMap={UPCOMING_STATUS_COLOR}
        icon={installment.status === 'pending' ? CalendarClock : undefined}
        showIcon
      />

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
        <div className="grid grid-cols-3 gap-3">
          {figures.map((figure) => (
            <div key={figure.label} className="min-w-0">
              <p className="truncate text-xs uppercase text-muted-foreground">{figure.label}</p>
              <p className={`truncate font-semibold tabular-nums ${figure.className}`}>{figure.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-green-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="w-10 text-end text-xs tabular-nums text-muted-foreground">{progress}%</span>
        </div>
      </div>

      <dl className="flex flex-col divide-y divide-border text-sm">
        {details.map((detail) => (
          <div key={detail.label} className="flex items-center justify-between gap-4 py-2" title={detail.hint}>
            <dt className="text-muted-foreground">{detail.label}</dt>
            <dd className="font-medium tabular-nums">{detail.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default InstallmentDetails;
