'use client';

import { BaseInput, DateRangeInput, NButton, NSkeleton, useTableStore } from 'najm-kit';
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

/**
 * The phone copy, in NTable's header slot: unlike the toolbar slot it renders
 * during the first load, holding the date row's place with a filter skeleton.
 */
export function FeesPhoneDateFilter({ value, onChange }: {
  value?: FeePaymentDateRange;
  onChange: (range: FeePaymentDateRange | undefined) => void;
}) {
  const isLoading = useTableStore.use.isLoading();
  const isRefreshing = useTableStore.use.isRefreshing();
  const bordered = useTableStore.use.bordered();
  return (
    <div data-phone-full-row className="flex w-full md:hidden">
      {isLoading && !isRefreshing
        ? <BaseInput data-ntable-filter-skeleton aria-hidden="true" bordered={bordered} className="w-full"><NSkeleton className="h-4 w-2/3" /></BaseInput>
        : <FeesDateFilter value={value} onChange={onChange} className="w-full" />}
    </div>
  );
}
