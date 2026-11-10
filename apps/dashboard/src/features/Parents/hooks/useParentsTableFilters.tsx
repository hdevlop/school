import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useTableViewFilter } from '@/hooks/useTableViewFilter';
import { buildRelationshipTypeOptions } from '../config/parentOptions';

type ParentFilterRow = { name?: string | null; email?: string | null; totalChildren?: number | string; isOrphaned?: boolean; relationshipType?: string; phone?: string | null; cin?: string | null };

export const useParentsTableFilters = () => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const deferredName = useDeferredValue(name);
  const deferredEmail = useDeferredValue(email);
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
  const needle = deferredName.toLowerCase().trim();
  const emailNeedle = deferredEmail.toLowerCase().trim();
  const matches = useCallback((parent: ParentFilterRow) => matchesView(parent)
    && (!needle || String(parent.name ?? '').toLowerCase().includes(needle)
      || String(parent.cin ?? '').toLowerCase().includes(needle))
    && (!emailNeedle || String(parent.email ?? '').toLowerCase().includes(emailNeedle)), [matchesView, needle, emailNeedle]);

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
      value: email,
      onChange: setEmail,
      className: 'w-full lg:w-64'
    },
    viewFilter,
  ], [t, searchFilter, viewFilter, email]);
  return { filters, searchFilter, viewFilter, matches, hasSelection: hasViewSelection || Boolean(needle || emailNeedle) };
};
