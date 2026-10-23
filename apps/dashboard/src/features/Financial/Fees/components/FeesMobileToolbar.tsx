'use client';

import { ComboboxInput, SelectInput, TextInput, NButton, Popover, PopoverContent, PopoverTrigger } from 'najm-kit';
import { Filter, Plus } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { PermissionButton } from '@/components/PermissionButton';

export type FeeTableFilter = {
  name: string;
  type: 'combobox' | 'select' | 'text';
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options?: Array<{ value: string; label: string }>;
  disabled?: boolean;
  showIcon?: boolean;
  className?: string;
};

/** Class and section stay inline; the remaining filters share one popover. */
export function FeesMobileToolbar({ filters, onCreate, loading }: {
  filters: FeeTableFilter[];
  onCreate: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const [schoolClass, section, ...additional] = filters;
  return (
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-2 md:hidden">
      <ComboboxInput
        value={schoolClass.value}
        onChange={schoolClass.onChange}
        items={schoolClass.options ?? []}
        placeholder={schoolClass.placeholder}
        aria-label={schoolClass.placeholder}
        showIcon={false}
        disabled={loading}
        className="min-w-0 w-full"
      />
      <SelectInput
        value={section.value}
        onChange={section.onChange}
        items={section.options ?? []}
        placeholder={section.placeholder}
        aria-label={section.placeholder}
        showIcon={false}
        disabled={loading || section.disabled}
        className="min-w-0 w-full"
      />
      <Popover>
        <PopoverTrigger asChild>
          <NButton variant="outline" size="icon" className="size-10 text-primary" aria-label={t('common.table.filters')} disabled={loading}>
            <Filter className="size-5" />
          </NButton>
        </PopoverTrigger>
        <PopoverContent align="end" aria-label={t('common.table.filterRegion')} className="w-[min(20rem,calc(100vw-2rem))] space-y-3 bg-card p-3">
          {additional.map((filter) => filter.type === 'text'
            ? <TextInput key={filter.name} value={filter.value} onChange={filter.onChange} placeholder={filter.placeholder} aria-label={filter.placeholder} className="w-full" />
            : <SelectInput key={filter.name} value={filter.value} onChange={filter.onChange} items={filter.options ?? []} placeholder={filter.placeholder} aria-label={filter.placeholder} showIcon={false} className="w-full" />)}
        </PopoverContent>
      </Popover>
      <PermissionButton permission="create:fees" variant="outline" size="icon" className="size-10 text-primary" onClick={onCreate} aria-label={t('fees.dialogs.createButton')} disabled={loading}>
        <Plus className="size-5" />
      </PermissionButton>
    </div>
  );
}
