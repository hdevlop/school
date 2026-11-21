'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, SelectInput,
} from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { HeaderSearchButton } from '@/components/HeaderSearchButton';
import { FilterSummaryButton, MobileFilterField, MobileFilterSheet } from '@/components/MobileFilterSheet';
import type { useClassSectionTableScope } from '@/features/Classes/hooks/useClassSectionTableScope';
import styles from './HomeworkMobile.module.css';

/** The phone list's search, an icon in the top bar beside the actions menu. */
export function HomeworkSearchButton({ search, onSearch }: { search: string; onSearch: (value: string) => void }) {
  const { t } = useTranslation();
  return <HeaderSearchButton search={search} onSearch={onSearch} label={t('homework.mobile.search')} placeholder={t('homework.mobile.searchPlaceholder')} />;
}

export function HomeworkMobileControls({ filters, homework, count, toggleButton, addButton }: {
  filters: ReturnType<typeof useClassSectionTableScope>['filters'];
  homework?: {
    subjects: Array<{ value: string; label: string }>;
    subjectId: string;
    onSubjectChange: (value: string) => void;
    newestFirst: boolean;
    onSort: (newestFirst: boolean) => void;
  };
  count?: number;
  toggleButton: ReactNode;
  addButton?: ReactNode;
}) {
  const { t } = useTranslation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const subjectLabel = t('homework.table.subject');
  const newest = t('homework.mobile.newest');
  const oldest = t('homework.mobile.oldest');
  const choices = filters.map((filter) => {
    // Every section of the chosen class reads as their names (A, B, C), which says more than "all sections".
    const all = filter.name === 'classScope' ? t('homework.mobile.allClasses')
      : filter.options.length ? filter.options.map((option) => option.label).join(', ') : t('homework.mobile.allSections');
    return { ...filter, all, items: [{ value: '', label: all }, ...filter.options] };
  });
  const summary = choices.map(({ value, all, items }) => items.find((item) => item.value === value)?.label ?? all);
  const selectedSubject = homework?.subjects.find((subject) => subject.value === homework.subjectId);
  if (selectedSubject) summary.push(selectedSubject.label);

  return (
    <section aria-label={t('common.table.filterRegion')} className="grid shrink-0 gap-2 md:hidden">
      <div className="flex items-center gap-2">
        <FilterSummaryButton parts={summary} onOpen={() => setFiltersOpen(true)} />
        {toggleButton}
        {addButton}
      </div>
      <div className={styles.results}>
        <span role="status">
          {count !== undefined && t(count === 1 ? 'homework.mobile.resultsOne' : 'homework.mobile.results', { count })}
        </span>
        {homework && <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={`${t('homework.mobile.sort')} · ${homework.newestFirst ? newest : oldest}`} className={styles.sortButton}>
              {homework.newestFirst ? newest : oldest}
              <ChevronDown className="size-3" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={homework.newestFirst ? 'newest' : 'oldest'} onValueChange={(value) => homework.onSort(value === 'newest')}>
              <DropdownMenuRadioItem value="newest">{newest}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="oldest">{oldest}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>}
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
        {homework && <MobileFilterField label={subjectLabel}>
          <SelectInput value={homework.subjectId} onChange={homework.onSubjectChange}
            items={[{ value: '', label: t('homework.mobile.allSubjects') }, ...homework.subjects]}
            placeholder={subjectLabel} ariaLabel={subjectLabel}
            disabled={!homework.subjects.length} showIcon={false} className="w-full min-w-0" />
        </MobileFilterField>}
      </MobileFilterSheet>
    </section>
  );
}
