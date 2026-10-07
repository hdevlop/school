'use client';

import { NAvatar, NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat, useSchoolToday } from '@/hooks/useSchoolFormat';
import { CHECK_STATUS_COLOR } from '../config/checkStatus';

/** One pending check at phone width; the row menu carries its actions. */
export default function CheckCard({ data: payment }: { data: any }) {
  const { t } = useTranslation();
  const { displayDateOnly, majorMoney } = useSchoolFormat();
  const today = useSchoolToday();
  const overdue = Boolean(payment.checkDueDate) && payment.checkDueDate < today;

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <NAvatar src={payment.student?.image} fallback={payment.student?.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium">{payment.student?.name ?? payment.studentId}</p>
            <p className="truncate text-xs text-muted-foreground">{payment.student?.studentCode}</p>
          </div>
        </div>
        <NBadge status={payment.status} statusMap={CHECK_STATUS_COLOR} label={t(`financialOperations.checkStatuses.${payment.status}`)} />
      </div>
      <div className="flex items-end justify-between gap-2 text-sm">
        <div className="min-w-0">
          <p className="font-mono">{payment.checkNumber}{payment.checkBank ? ` · ${payment.checkBank}` : ''}</p>
          <p className={overdue ? 'text-destructive' : 'text-muted-foreground'}>
            {t('payments.table.checkDueDate')}: {payment.checkDueDate ? displayDateOnly(payment.checkDueDate) : '—'}
          </p>
        </div>
        <p className="shrink-0 font-semibold tabular-nums">{majorMoney(Number(payment.amount || 0))}</p>
      </div>
    </div>
  );
}
