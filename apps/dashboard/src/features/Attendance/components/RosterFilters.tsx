'use client';

import type { ReactNode } from 'react';
import { ComboboxInput, DateInput, NSkeleton, SelectInput, TextInput, cn, useCardViewport } from 'najm-kit';
import { Search } from 'lucide-react';
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

function RosterFilterInput({ filter, compact = false, loading = false }: { filter: RosterFilter; compact?: boolean; loading?: boolean }) {
  if (loading) return <NSkeleton data-roster-loading-filter={filter.name} className="h-10 w-full" />;
  if (filter.type === 'text') {
    return <TextInput value={filter.value} onChange={filter.onChange} placeholder={filter.placeholder} aria-label={filter.label} icon={Search} className="w-full [&_input]:text-sm" />;
  }
  if (filter.type === 'date') {
    return <DateInput value={filter.value ? parseISO(filter.value) : undefined} onChange={(value) => { if (value) filter.onChange(value); }} placeholder={filter.placeholder} ariaLabel={filter.label} showIcon={!compact} className="w-full" />;
  }
  if (filter.type === 'combobox') {
    return <ComboboxInput value={filter.value} onChange={filter.onChange} items={filter.options ?? []} placeholder={filter.placeholder} ariaLabel={filter.label} disabled={filter.disabled} showIcon={false} className="w-full" />;
  }
  return <SelectInput value={filter.value} onChange={filter.onChange} items={filter.options ?? []} placeholder={filter.placeholder} ariaLabel={filter.label} disabled={filter.disabled} showIcon={false} className="w-full" />;
}

export default function RosterFilters({ filters, children, loading = false }: {
  filters: RosterFilter[];
  children: ReactNode;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const compact = useCardViewport();
  const date = filters.find((filter) => filter.type === 'date');
  const searches = filters.filter((filter) => filter.type === 'text');
  const statuses = filters.filter((filter) => filter.name === 'status');
  const scope = filters.filter((filter) => filter !== date && filter.type !== 'text' && filter.name !== 'status');
  const [first, second, ...more] = scope;

  // Phones: search on its own row, scope controls on the next, date and status
  // together underneath. Desktop: one line, the counts and actions at its end.
  return (
    <section data-roster-filters aria-label={t('common.table.filterRegion')} aria-busy={loading || undefined} className="grid shrink-0 grid-cols-2 items-center gap-2 lg:flex lg:flex-wrap">
      {searches.map((filter) => (
        <div key={filter.name} className={cn('col-span-2 min-w-0 lg:w-72', filter.className)}>
          <RosterFilterInput filter={filter} loading={loading} />
        </div>
      ))}
      {first && (
        <div className={cn('min-w-0 lg:w-48', first.className)}>
          <RosterFilterInput filter={first} loading={loading} />
        </div>
      )}
      {second && (
        <div className={cn('min-w-0 lg:w-48', second.className)}>
          <RosterFilterInput filter={second} loading={loading} />
        </div>
      )}
      {more.map((filter) => (
        <div key={filter.name} className={cn('col-span-2 min-w-0 lg:w-48', filter.className)}>
          <RosterFilterInput filter={filter} loading={loading} />
        </div>
      ))}
      {date && (
        <div className={cn('min-w-0 lg:w-48', date.className)}>
          <RosterFilterInput filter={date} compact={compact} loading={loading} />
        </div>
      )}
      {statuses.map((filter) => (
        <div key={filter.name} className={cn('min-w-0 lg:w-48', filter.className)}>
          <RosterFilterInput filter={filter} loading={loading} />
        </div>
      ))}
      {children}
    </section>
  );
}
