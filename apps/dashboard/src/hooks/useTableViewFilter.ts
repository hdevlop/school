'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'najm-i18n/react';

interface TableViewOption<T> {
  value: string;
  label: string;
  matches: (row: T) => boolean;
}

/** One standard table filter; each feature supplies its own choices and predicates. */
export function useTableViewFilter<T>(options: readonly TableViewOption<T>[]) {
  const { t } = useTranslation();
  const [selection, setSelection] = useState('');
  const value = options.some(option => option.value === selection) ? selection : '';
  const onChange = useCallback((value: string) => setSelection(value === '__clear__' ? '' : value), []);
  const matches = useCallback((row: T) => options.find(option => option.value === value)?.matches(row) ?? true, [value, options]);
  const filter = useMemo(() => ({
    name: 'show',
    type: 'select',
    showIcon: false,
    placeholder: t('common.filters'),
    value,
    onChange,
    options: [{ value: '__clear__', label: t('common.all') }, ...options.map(({ value, label }) => ({ value, label }))],
    className: 'w-full sm:w-40 xl:w-40',
  }), [t, value, onChange, options]);
  return { filter, matches, hasSelection: !!value };
}
