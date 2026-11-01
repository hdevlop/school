'use client';

import { DateRangeInput, NButton } from 'najm-kit';
import { X } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import type { FeePaymentDateRange } from '../config/feeListFilters';

export function FeesDateFilter({ value, onChange, className = 'w-64' }: {
  value?: FeePaymentDateRange;
  onChange: (range: FeePaymentDateRange | undefined) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={`flex min-w-0 items-center gap-1 ${className}`}>
      <DateRangeInput
        value={value}
        onChange={({ from, to }) => { if (typeof from === 'string' && typeof to === 'string') onChange({ from, to }); }}
        ariaLabel={t('fees.filters.paymentDates')}
        placeholder={t('fees.filters.paymentDates')}
        className="min-w-0 flex-1"
      />
      {value && <NButton type="button" variant="outline" size="icon" className="size-10" onClick={() => onChange(undefined)} aria-label={t('fees.filters.clearPaymentDates')} title={t('fees.filters.clearPaymentDates')}>
        <X className="size-4" aria-hidden="true" />
      </NButton>}
    </div>
  );
}
