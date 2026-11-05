'use client';

import { BaseInput, NSkeleton, SelectInput, TextInput, useTableStore, type SelectItemType } from 'najm-kit';
import styles from './ClassSectionTableFilters.module.css';

export const classSectionTableHeader = styles.header;

type SearchFilter = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

type SelectFilter = SearchFilter & {
  options: SelectItemType[];
  disabled?: boolean;
};

/** Filters this component shows on phones; NTable keeps only the Class select there. */
export const PHONE_INLINE_FILTERS: readonly string[] = ['sectionScope', 'name', 'show'];

/**
 * Completes NTable's mobile Class row with Section and the list's view filter,
 * so every choice stays in sight rather than behind a filter button, and adds
 * a full-width search below it.
 */
export function ClassSectionTableFilters({ sectionFilter, viewFilter, searchFilter }: {
  sectionFilter?: SelectFilter;
  viewFilter?: SelectFilter;
  searchFilter: SearchFilter;
}) {
  const isLoading = useTableStore.use.isLoading();
  const isRefreshing = useTableStore.use.isRefreshing();
  const bordered = useTableStore.use.bordered();
  const loading = isLoading && !isRefreshing;
  const skeleton = <BaseInput data-ntable-filter-skeleton aria-hidden="true" bordered={bordered}>
    <NSkeleton className="h-4 w-2/3" />
  </BaseInput>;

  const select = (filter: SelectFilter) => <div data-class-section-filter className="min-w-0 md:hidden">
    {loading ? skeleton : <SelectInput
      value={filter.value}
      onChange={filter.onChange}
      items={filter.options}
      placeholder={filter.placeholder}
      showIcon={false}
      disabled={filter.disabled}
      bordered={bordered}
      className="w-full"
    />}
  </div>;

  return <>
    {sectionFilter && select(sectionFilter)}
    {viewFilter && select(viewFilter)}
    <div data-class-section-search className="w-full md:hidden">
      {loading ? skeleton : <TextInput
        value={searchFilter.value}
        onChange={searchFilter.onChange}
        placeholder={searchFilter.placeholder}
        aria-label={searchFilter.placeholder}
        bordered={bordered}
        className="w-full"
      />}
    </div>
  </>;
}
