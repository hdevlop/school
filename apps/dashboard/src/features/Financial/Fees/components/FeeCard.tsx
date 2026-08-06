"use client";

import React from 'react';
import { NAvatar } from 'najm-kit';
import { Label } from 'najm-kit';
import { Progress } from 'najm-kit';
import { NBadge } from 'najm-kit';
import { getAvatarFallback } from '@/lib/avatar';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';;
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { useTranslation } from '@/hooks/useLanguage';

const FeeCard = ({ data }: any) => {
  const { t } = useTranslation();
  const { publicSettings } = usePublicSettings();
  const currency = publicSettings?.currency || 'USD';

  const student = data?.student;
  const className = data?.class?.name;
  const sectionName = data?.section?.name;

  const netAmount = Number(data?.netAmount ?? 0);
  const totalPaid = Number(data?.totalPaid ?? 0);
  const totalDue = Number(data?.totalDue ?? 0);
  const overdueCount = Number(data?.overdueCount ?? 0);

  const progress = netAmount > 0 ? Math.min((totalPaid / netAmount) * 100, 100) : 0;
  const isPaid = totalDue <= 0 && netAmount > 0;

  return (
    <div
      className={`flex flex-col gap-3 p-4 ${
        isPaid
          ? 'border border-green-300 bg-green-50/80 text-green-950'
          : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <NAvatar
          src={student?.image}
          fallback={getAvatarFallback(student?.name)}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <Label className="text-sm font-bold text-foreground block truncate">
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
          <NBadge statusMap={STATUS_COLOR_MAP} status="paid" size="md" look="solid" showIcon className="mr-2">
            {t('fees.status.paid') || 'Paid'}
          </NBadge>
        ) : overdueCount > 0 && (
          <NBadge statusMap={STATUS_COLOR_MAP} status="overdue" size="md" look="solid" showIcon className="mr-2">
            {overdueCount} {t('fees.status.overdue') || 'Overdue'}
          </NBadge>
        )}
      </div>

      <>
        <div className="text-center">
          <p className={`text-xl font-bold tabular-nums ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
            {isPaid ? netAmount.toFixed(2) : totalDue.toFixed(2)} <span className="text-sm">{currency}</span>
          </p>
        </div>

        <div className="space-y-1">
          <Progress value={progress} className="h-2" color={isPaid ? 'success' : 'primary'} />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{t('fees.table.paidAmount')}: {totalPaid.toFixed(0)} {currency}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </>
    </div>
  );
};

export default FeeCard;
