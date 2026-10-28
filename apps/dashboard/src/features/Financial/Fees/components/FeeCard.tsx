"use client";

import React from 'react';
import { NAvatar } from 'najm-kit';
import { Progress } from 'najm-kit';
import { NBadge } from 'najm-kit';
import { SimpleTooltip } from 'najm-kit';
import { FileX2 } from 'lucide-react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useTranslation } from 'najm-i18n/react';
import { getFeeCardSummary } from '../utils/feeCardSummary';

const FeeCard = ({ data }: any) => {
  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();

  const student = data?.student;
  const className = data?.class?.name;
  const sectionName = data?.section?.name;
  const placement = [className, sectionName].filter(Boolean).join(' - ');
  const studentDetails = [student?.studentCode, placement].filter(Boolean).join(' | ');

  const { hasFees, hasOverdue, isPaid, paidAmount, overdueAmount, netAmount, progress } = getFeeCardSummary(data ?? undefined);

  return (
    <div
      className={`flex h-full flex-col gap-3 border p-4 ${
        isPaid
          ? 'border-green-300 bg-green-50/80 text-green-950'
          : 'border-transparent'
      }`}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 pe-6">
        <NAvatar
          src={student?.image}
          fallback={student?.name}
          size="sm"
          className="shrink-0"
        />
        <div className="min-w-0">
          <p title={student?.name} className="truncate text-sm leading-5 font-bold text-foreground">
            {student?.name}
          </p>
          <p title={studentDetails} className="truncate text-xs leading-4 text-muted-foreground">
            {studentDetails || '\u00a0'}
          </p>
        </div>
        {isPaid ? (
          <NBadge status="paid" look="solid" showIcon className="basis-auto shrink-0">
            {t('fees.status.paid') || 'Paid'}
          </NBadge>
        ) : hasFees && hasOverdue && (
          <NBadge status="overdue" look="solid" showIcon className="basis-auto shrink-0">
            {t('fees.status.overdue') || 'Overdue'}
          </NBadge>
        )}
      </div>

      {hasFees ? <>
        <dl className={`grid gap-3 text-center ${hasOverdue ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{t('fees.stats.paidToDate')}</dt>
            <dd className={`text-lg font-bold tabular-nums wrap-anywhere ${isPaid ? 'text-green-600' : 'text-foreground'}`}>
              {majorMoney(paidAmount)}
            </dd>
          </div>
          {hasOverdue && <div className="min-w-0 border-s border-border/50 ps-3">
            <dt className="text-xs text-muted-foreground">{t('fees.stats.overdueAmount')}</dt>
            <dd className={`text-lg font-bold tabular-nums wrap-anywhere ${hasOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
              {majorMoney(overdueAmount)}
            </dd>
          </div>}
        </dl>

        <div className="mt-auto space-y-1">
          <Progress value={progress} className="h-2" color="success" />
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>{t('fees.stats.totalFees')}: {majorMoney(netAmount)}</span>
            <span className="shrink-0">{Math.round(progress)}%</span>
          </div>
        </div>
      </> : (
        <div className="flex min-h-20 flex-col items-center justify-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{t('fees.studentView.noFeesLabel')}</span>
          <SimpleTooltip content={t('fees.studentView.noFees')}>
            <span
              role="img"
              aria-label={t('fees.studentView.noFees')}
              className="inline-flex size-12 items-center justify-center rounded-xl border border-dashed border-border bg-muted/50 text-muted-foreground/60"
            >
              <FileX2 className="size-6" strokeWidth={1.5} aria-hidden="true" />
            </span>
          </SimpleTooltip>
        </div>
      )}
    </div>
  );
};

export default FeeCard;
