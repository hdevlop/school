'use client';

import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, SelectInput, TextInput,
} from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { FilterSummaryButton, MobileFilterField, MobileFilterSheet } from '@/components/MobileFilterSheet';
import type { useClassSectionTableScope } from '@/features/Classes/hooks/useClassSectionTableScope';
import styles from './HomeworkMobile.module.css';

export function HomeworkMobileControls({ filters, subjects, subjectId, onSubjectChange, search, onSearch, count, newestFirst, onSort }: {
  filters: ReturnType<typeof useClassSectionTableScope>['filters'];
  subjects: Array<{ value: string; label: string }>;
  subjectId: string;
  onSubjectChange: (value: string) => void;
  search: string;
  onSearch: (value: string) => void;
  count?: number;
  newestFirst: boolean;
  onSort: (newestFirst: boolean) => void;
}) {
  const { t } = useTranslation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchLabel = t('homework.mobile.search');
  const subjectLabel = t('homework.table.subject');
  const subjectItems = [{ value: '', label: t('homework.mobile.allSubjects') }, ...subjects];
  const newest = t('homework.mobile.newest');
  const oldest = t('homework.mobile.oldest');
  const choices = filters.map((filter) => {
    const all = t(filter.name === 'classScope' ? 'homework.mobile.allClasses' : 'homework.mobile.allSections');
    return { ...filter, all, items: [{ value: '', label: all }, ...filter.options] };
  });
  const summary = choices.map(({ value, all, items }) => items.find((item) => item.value === value)?.label ?? all);
  const selectedSubject = subjects.find((subject) => subject.value === subjectId);
  if (selectedSubject) summary.push(selectedSubject.label);

  return (
    <section aria-label={t('common.table.filterRegion')} className="grid shrink-0 gap-2 md:hidden">
      <FilterSummaryButton parts={summary} onOpen={() => setFiltersOpen(true)} />
      <TextInput value={search} onChange={onSearch} placeholder={t('homework.mobile.searchPlaceholder')} aria-label={searchLabel}
        icon={Search} className="w-full min-w-0 [&_input]:text-sm" />
      <div className={styles.results}>
        <span role="status">
          {count !== undefined && t(count === 1 ? 'homework.mobile.resultsOne' : 'homework.mobile.results', { count })}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={`${t('homework.mobile.sort')} · ${newestFirst ? newest : oldest}`} className={styles.sortButton}>
              {newestFirst ? newest : oldest}
              <ChevronDown className="size-3" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={newestFirst ? 'newest' : 'oldest'} onValueChange={(value) => onSort(value === 'newest')}>
              <DropdownMenuRadioItem value="newest">{newest}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="oldest">{oldest}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <MobileFilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <div className="grid grid-cols-2 gap-2">
          {choices.map(({ name, placeholder, disabled, value, onChange, items }) => (
            <MobileFilterField key={name} label={placeholder}>
              <SelectInput value={value} onChange={onChange} items={items} placeholder={placeholder} ariaLabel={placeholder}
                disabled={disabled || items.length === 1} showIcon={false} className="w-full min-w-0" />
            </MobileFilterField>
          ))}
        </div>
        <MobileFilterField label={subjectLabel}>
          <SelectInput value={subjectId} onChange={onSubjectChange} items={subjectItems} placeholder={subjectLabel} ariaLabel={subjectLabel}
            disabled={!subjects.length} showIcon={false} className="w-full min-w-0" />
        </MobileFilterField>
      </MobileFilterSheet>
    </section>
  );
}
