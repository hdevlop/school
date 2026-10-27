"use client";

import React from 'react';
import { NAvatar } from 'najm-kit';
import { Label } from 'najm-kit';
import { Progress } from 'najm-kit';
import { NBadge } from 'najm-kit';
import { SimpleTooltip } from 'najm-kit';
import { FileX2 } from 'lucide-react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useTranslation } from 'najm-i18n/react';

const FeeCard = ({ data }: any) => {
  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();

  const student = data?.student;
  const className = data?.class?.name;
  const sectionName = data?.section?.name;

  const netAmount = Number(data?.netAmount ?? 0);
  const totalPaid = Number(data?.totalPaid ?? 0);
  const totalDue = Number(data?.totalDue ?? 0);
  const hasOverdue = Number(data?.overdueAmount ?? 0) > 0;
  const hasFees = Number(data?.totalFees ?? 0) > 0;

  const isPaid = hasFees && totalDue <= 0;
  const progress = netAmount > 0 ? Math.min((totalPaid / netAmount) * 100, 100) : isPaid ? 100 : 0;

  return (
    <div
      className={`flex flex-col gap-3 p-4 ${
        isPaid
          ? 'border border-green-300 bg-green-50/80 text-green-950'
          : ''
      }`}
    >
      <div className="flex flex-wrap items-start gap-3 pe-8">
        <NAvatar
          src={student?.image}
          fallback={student?.name}
          size="sm"
          className="shrink-0"
        />
        <div className="min-w-0 flex-1 basis-32">
          <Label className="text-sm font-bold text-foreground block whitespace-normal break-words">
            {student?.name}
          </Label>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{student?.studentCode}</span>
            {(className || sectionName) && (
              <>
                <span className="text-border">|</span>
                <span>{className}{sectionName ? ` - ${sectionName}` : ''}</span>
              </>
            )}
          </div>
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
        <div className="text-center">
          <p className={`text-xl font-bold tabular-nums ${isPaid ? 'text-green-600' : hasOverdue ? 'text-red-600' : 'text-foreground'}`}>
            {majorMoney(isPaid ? netAmount : totalDue)}
          </p>
        </div>

        <div className="space-y-1">
          <Progress value={progress} className="h-2" color="success" />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{t('fees.table.paidAmount')}: {majorMoney(totalPaid)}</span>
            <span>{Math.round(progress)}%</span>
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
