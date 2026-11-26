'use client';

import { useState, type ReactNode } from 'react';
import { ComboboxInput, SelectInput, useTableStore, type NTableState } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { FilterSummaryButton, MobileFilterField, MobileFilterSheet } from '@/components/MobileFilterSheet';
import { withoutScopeAllOption, type useClassSectionTableScope } from '@/features/Classes/hooks/useClassSectionTableScope';
import type { useBehaviorRewardsTableFilters } from '../hooks/useBehaviorRewardsTableFilters';

/** The search is an icon in the page header (see BehaviorRewardsTable), as on the homework list. */
export default function BehaviorRewardsMobileFilters({ columnFilters, rewardFilters, scopeFilters, addButton }: {
  columnFilters: NTableState['columnFilters'];
  rewardFilters: ReturnType<typeof useBehaviorRewardsTableFilters>;
  scopeFilters: ReturnType<typeof useClassSectionTableScope>['filters'];
  /** Beside the filters, for whoever may record one: one tap from the list. */
  addButton?: ReactNode;
}) {
  const { t } = useTranslation();
  const table = useTableStore.use.table();
  const bordered = useTableStore.use.bordered();
  const [open, setOpen] = useState(false);
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
  })].map(({ options: listed, ...filter }) => {
    const options = withoutScopeAllOption(listed);
    const sectionNames = filter.name === 'sectionScope'
      ? options.map((option) => option.label).join(', ')
      : '';
    const selected = options.find((option) => option.value === filter.value);
    return {
      ...filter,
      items: [sectionNames ? { ...all, label: sectionNames } : all, ...options],
      summaryLabel: selected?.label ?? sectionNames,
    };
  });
  const summary = filters.map(({ summaryLabel }) => summaryLabel).filter(Boolean);

  return (
    <section aria-label={t('common.table.filterRegion')} className="grid w-full min-w-0 gap-2 md:hidden">
      <div className="flex items-center gap-2">
        <FilterSummaryButton parts={summary} onOpen={() => setOpen(true)} />
        {addButton}
      </div>
      <MobileFilterSheet open={open} onClose={() => setOpen(false)}>
        <div className="grid grid-cols-2 gap-2">
          {filters.map(({ name, type, placeholder, value, onChange, items, disabled }) => {
            const Input = type === 'combobox' ? ComboboxInput : SelectInput;
            // Class and section share a row; each reward filter takes its own.
            return (
              <div key={name} className={name === 'category' || name === 'rewardType' ? 'col-span-2' : undefined}>
                <MobileFilterField label={placeholder}>
                  <Input value={value} onChange={onChange} items={items} placeholder={placeholder} ariaLabel={placeholder}
                    disabled={disabled || items.length === 1} showIcon={false} bordered={bordered} className="w-full min-w-0" />
                </MobileFilterField>
              </div>
            );
          })}
        </div>
      </MobileFilterSheet>
    </section>
  );
}
