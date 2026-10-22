import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useTableViewFilter } from '@/hooks/useTableViewFilter';
import { buildRelationshipTypeOptions } from '../config/parentOptions';

type ParentFilterRow = { totalChildren?: number | string; isOrphaned?: boolean; relationshipType?: string; phone?: string | null; cin?: string | null };

export const useParentsTableFilters = () => {
  const { t } = useTranslation();
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
  const view = useTableViewFilter(viewOptions);

  const filters = useMemo(() => [
    {
      name: 'name',
      placeholder: t('parents.filters.searchByName'),
      type: 'text',
      className: 'w-full lg:w-64'
    },
    {
      name: 'email',
      placeholder: t('parents.filters.searchByEmail'),
      type: 'text',
      className: 'w-full lg:w-64'
    },
    view.filter,
  ], [t, view.filter]);
  return { filters, matches: view.matches, hasSelection: view.hasSelection };
};
