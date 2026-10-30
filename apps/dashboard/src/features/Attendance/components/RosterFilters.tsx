'use client';

import type { ReactNode } from 'react';
import { ComboboxInput, DateInput, NButton, Popover, PopoverContent, PopoverTrigger, SelectInput, TextInput, cn, useCardViewport } from 'najm-kit';
import { Filter, RotateCcw, Search } from 'lucide-react';
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

// Search and status narrow the register on screen without changing which
// register is open, so below lg they wait in the filters popover.
const isRefinement = (filter: RosterFilter) => filter.type === 'text' || filter.name === 'status';

function RosterFilterInput({ filter, compact = false }: { filter: RosterFilter; compact?: boolean }) {
  if (filter.type === 'text') {
    return <TextInput value={filter.value} onChange={filter.onChange} placeholder={filter.placeholder} aria-label={filter.label} icon={Search} className="w-full" />;
  }
  if (filter.type === 'date') {
    return <DateInput value={filter.value ? parseISO(filter.value) : undefined} onChange={(value) => { if (value) filter.onChange(value); }} placeholder={filter.placeholder} ariaLabel={filter.label} showIcon={!compact} className="w-full" />;
  }
  if (filter.type === 'combobox') {
    return <ComboboxInput value={filter.value} onChange={filter.onChange} items={filter.options ?? []} placeholder={filter.placeholder} ariaLabel={filter.label} disabled={filter.disabled} showIcon={false} className="w-full" />;
  }
  return <SelectInput value={filter.value} onChange={filter.onChange} items={filter.options ?? []} placeholder={filter.placeholder} ariaLabel={filter.label} disabled={filter.disabled} showIcon={false} className="w-full" />;
}

export default function RosterFilters({ filters, onReset, canReset, children }: {
  filters: RosterFilter[];
  onReset: () => void;
  canReset: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const compact = useCardViewport();
  const date = filters.find((filter) => filter.type === 'date');
  const refinements = filters.filter(isRefinement);
  // The class leads the first row and the section shares it with the filters
  // button; a third register filter (the per-class teacher and subject) takes
  // a row of its own below lg.
  const scope = filters.filter((filter) => filter !== date && !isRefinement(filter));
  const [first, second, ...more] = scope;
  const refined = refinements.some((filter) => !!filter.value);
  const resetLabel = t('attendance.roster.resetFilters');

  // Below lg the toolbar is a two-column grid: the class above the day, so the
  // two share one width, and the section and filters above the summary that
  // RosterHeader places in the second column. At lg it becomes the one line
  // the filters had before.
  return (
    <section aria-label={t('common.table.filterRegion')} className="grid shrink-0 grid-flow-row-dense grid-cols-[minmax(0,1fr)_auto] items-center gap-2 lg:flex lg:flex-wrap">
      {first && (
        <div className={cn('min-w-0 lg:w-56', first.className)}>
          <RosterFilterInput filter={first} />
        </div>
      )}
      <div className="flex min-w-0 items-center justify-end gap-2 lg:contents">
        {second && (
          <div className={cn('min-w-0 flex-1 lg:w-56 lg:flex-none', second.className)}>
            <RosterFilterInput filter={second} />
          </div>
        )}
        {refinements.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <NButton variant="outline" size="icon" aria-label={t('common.table.filters')} title={t('common.table.filters')} className="relative size-10 shrink-0 text-primary lg:hidden">
                <Filter className="size-5" />
                {refined && <span aria-hidden="true" className="absolute inset-e-1.5 top-1.5 size-2 rounded-full bg-primary" />}
              </NButton>
            </PopoverTrigger>
            <PopoverContent align="end" aria-label={t('common.table.filterRegion')} className="w-[min(20rem,calc(100vw-2rem))] space-y-3 bg-card p-3">
              {refinements.map((filter) => <RosterFilterInput key={filter.name} filter={filter} />)}
              <NButton variant="outline" onClick={onReset} disabled={!canReset} leftIcon={<RotateCcw className="h-4 w-4" />} className="w-full">
                {resetLabel}
              </NButton>
            </PopoverContent>
          </Popover>
        )}
      </div>
      {more.map((filter) => (
        <div key={filter.name} className={cn('col-span-2 min-w-0 lg:w-56', filter.className)}>
          <RosterFilterInput filter={filter} />
        </div>
      ))}
      {refinements.filter((filter) => filter.type === 'text').map((filter) => (
        <div key={filter.name} className={cn('hidden min-w-0 lg:order-first lg:block lg:w-56', filter.className)}>
          <RosterFilterInput filter={filter} />
        </div>
      ))}
      {date && (
        <div className={cn('min-w-0 lg:w-56', date.className)}>
          <RosterFilterInput filter={date} compact={compact} />
        </div>
      )}
      {refinements.filter((filter) => filter.type !== 'text').map((filter) => (
        <div key={filter.name} className={cn('hidden min-w-0 lg:block lg:w-56', filter.className)}>
          <RosterFilterInput filter={filter} />
        </div>
      ))}
      <NButton variant="outline" onClick={onReset} disabled={!canReset} aria-label={resetLabel} title={resetLabel} className="hidden h-10 w-10 shrink-0 p-0 lg:order-1 lg:ms-auto lg:flex">
        <RotateCcw className="h-4 w-4" />
      </NButton>
      {children}
    </section>
  );
}
