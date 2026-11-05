import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useTableViewFilter } from '@/hooks/useTableViewFilter';
import { buildRelationshipTypeOptions } from '../config/parentOptions';

type ParentFilterRow = { name?: string | null; totalChildren?: number | string; isOrphaned?: boolean; relationshipType?: string; phone?: string | null; cin?: string | null };

export const useParentsTableFilters = () => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const viewOptions = useMemo(() => [
    { value: 'missing-parent-details', label: t('parents.filters.missingDetails'),
      matches: (parent: ParentFilterRow) => !parent.phone?.trim() || !parent.cin?.trim() },
    { value: 'without-students', label: t('parents.filters.withoutStudents'),
      matches: (parent: ParentFilterRow) => parent.isOrphaned === true || Number(parent.totalChildren) === 0 },
    ...buildRelationshipTypeOptions(t).map(({ value, label }) => ({
      value,
      label,
      matches: (parent: ParentFilterRow) => parent.relationshipType === value,
    })),
  ], [t]);
  const { matches: matchesView, filter: viewFilter, hasSelection: hasViewSelection } = useTableViewFilter(viewOptions);
  const needle = name.toLowerCase().trim();
  const matches = useCallback((parent: ParentFilterRow) => matchesView(parent)
    && (!needle || String(parent.name ?? '').toLowerCase().includes(needle)
      || String(parent.cin ?? '').toLowerCase().includes(needle)), [matchesView, needle]);

  const searchFilter = useMemo(() => ({
    name: 'name',
    placeholder: t('parents.filters.searchByNameOrCin'),
    type: 'text',
    value: name,
    onChange: setName,
    className: 'w-full lg:w-64',
  }), [t, name]);

  const filters = useMemo(() => [
    searchFilter,
    {
      name: 'email',
      placeholder: t('parents.filters.searchByEmail'),
      type: 'text',
      className: 'w-full lg:w-64'
    },
    viewFilter,
  ], [t, searchFilter, viewFilter]);
  return { filters, searchFilter, viewFilter, matches, hasSelection: hasViewSelection || Boolean(needle) };
};
