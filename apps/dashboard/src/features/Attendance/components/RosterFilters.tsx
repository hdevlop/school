'use client';

import type { ReactNode } from 'react';
import { ComboboxInput, DateInput, NButton, SelectInput, TextInput } from 'najm-kit';
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
}

export default function RosterFilters({ filters, onReset, canReset, children }: {
  filters: RosterFilter[];
  onReset: () => void;
  canReset: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <section aria-label={t('common.table.filterRegion')} className="shrink-0 rounded-lg border bg-card p-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {filters.map((filter) => (
          <div key={filter.name} className={`min-w-0 space-y-1.5 ${filter.type === 'text' ? 'order-first col-span-2 sm:order-none sm:col-span-1' : ''}`}>
            <div className="text-xs font-medium text-muted-foreground">{filter.label}</div>
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
      </div>
      <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-3 border-t pt-3">
        <NButton variant="ghost" onClick={onReset} disabled={!canReset}>
          <RotateCcw className="h-4 w-4" />
          {t('attendance.roster.resetFilters')}
        </NButton>
        <div className="w-full min-w-0 sm:w-auto">{children}</div>
      </div>
    </section>
  );
}
