'use client';

import type { ReactNode } from 'react';
import { ComboboxInput, DateInput, NButton, SelectInput, TextInput, cn } from 'najm-kit';
import { RotateCcw, Search } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { parseISO } from 'date-fns';

export interface RosterFilter {
  name: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options?: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
}

export default function RosterFilters({ filters, onReset, canReset, children }: {
  filters: RosterFilter[];
  onReset: () => void;
  canReset: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <section aria-label={t('common.table.filterRegion')} className="flex shrink-0 flex-wrap items-center gap-2">
      {/* Below lg the search keeps a row of its own and the other filters pair
          up two per row, so a phone sees the register sooner. */}
      {filters.map((filter) => (
        <div
          key={filter.name}
          className={cn(
            'min-w-0 shrink-0',
            filter.className ?? 'w-full lg:w-56',
            filter.type === 'text' ? 'order-first' : 'w-[calc(50%-0.25rem)]',
          )}
        >
          {filter.type === 'text' ? (
            <TextInput value={filter.value} onChange={filter.onChange} placeholder={filter.placeholder} aria-label={filter.label} icon={Search} className="w-full" />
          ) : filter.type === 'date' ? (
            <DateInput value={filter.value ? parseISO(filter.value) : undefined} onChange={(value) => { if (value) filter.onChange(value); }} placeholder={filter.placeholder} ariaLabel={filter.label} className="w-full" />
          ) : filter.type === 'combobox' ? (
            <ComboboxInput value={filter.value} onChange={filter.onChange} items={filter.options ?? []} placeholder={filter.placeholder} ariaLabel={filter.label} disabled={filter.disabled} showIcon={false} className="w-full" />
          ) : (
            <SelectInput value={filter.value} onChange={filter.onChange} items={filter.options ?? []} placeholder={filter.placeholder} ariaLabel={filter.label} disabled={filter.disabled} showIcon={false} className="w-full" />
          )}
        </div>
      ))}
      <div className="flex w-full min-w-0 items-center gap-2 lg:ms-auto lg:w-auto">
        <NButton variant="outline" onClick={onReset} disabled={!canReset} aria-label={t('attendance.roster.resetFilters')} title={t('attendance.roster.resetFilters')} className="h-10 w-10 shrink-0 p-0">
          <RotateCcw className="h-4 w-4" />
        </NButton>
        <div className="min-w-0 flex-1 lg:flex-none">{children}</div>
      </div>
    </section>
  );
}
