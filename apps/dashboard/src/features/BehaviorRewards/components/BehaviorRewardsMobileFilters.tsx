'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { ComboboxInput, SelectInput, TextInput, useTableStore, type NTableState } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { FilterSummaryButton, MobileFilterField, MobileFilterSheet } from '@/components/MobileFilterSheet';
import type { useClassSectionTableScope } from '@/features/Classes/hooks/useClassSectionTableScope';
import type { useBehaviorRewardsTableFilters } from '../hooks/useBehaviorRewardsTableFilters';

export default function BehaviorRewardsMobileFilters({ search, columnFilters, rewardFilters, scopeFilters }: {
  search: string;
  columnFilters: NTableState['columnFilters'];
  rewardFilters: ReturnType<typeof useBehaviorRewardsTableFilters>;
  scopeFilters: ReturnType<typeof useClassSectionTableScope>['filters'];
}) {
  const { t } = useTranslation();
  const table = useTableStore.use.table();
  const bordered = useTableStore.use.bordered();
  const [open, setOpen] = useState(false);
  const searchLabel = t('behaviorRewards.filters.search');
  const all = { value: '', label: t('common.table.allOption') };
  const filters = [...scopeFilters, ...rewardFilters.flatMap((filter) => {
    if (!filter.options) return [];
    const value = columnFilters.find(({ id }) => id === filter.name)?.value;
    return [{
      ...filter,
      disabled: false,
      value: typeof value === 'string' ? value : '',
      onChange: (next: string) => table?.getColumn(filter.name)?.setFilterValue(next || undefined),
    }];
  })];
  const summary = filters.flatMap(({ options, value }) => {
    const selected = options.find((option) => option.value === value);
    return selected ? [selected.label] : [];
  });

  return (
    <section aria-label={t('common.table.filterRegion')} className="grid w-full min-w-0 gap-2 md:hidden">
      <FilterSummaryButton parts={summary} onOpen={() => setOpen(true)} />
      <TextInput value={search} onChange={(value) => table?.setGlobalFilter(value)} placeholder={searchLabel} aria-label={searchLabel}
        icon={Search} bordered={bordered} className="w-full min-w-0 [&_input]:text-sm" />
      <MobileFilterSheet open={open} onClose={() => setOpen(false)}>
        <div className="grid grid-cols-2 gap-2">
          {filters.map(({ name, type, placeholder, value, onChange, options, disabled }) => {
            const Input = type === 'combobox' ? ComboboxInput : SelectInput;
            return (
              <div key={name} className={name === 'rewardType' ? 'col-span-2' : undefined}>
                <MobileFilterField label={placeholder}>
                  <Input value={value} onChange={onChange} items={[all, ...options]} placeholder={placeholder} ariaLabel={placeholder}
                    disabled={disabled || !options.length} showIcon={false} bordered={bordered} className="w-full min-w-0" />
                </MobileFilterField>
              </div>
            );
          })}
        </div>
      </MobileFilterSheet>
    </section>
  );
}
