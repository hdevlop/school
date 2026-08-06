import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useLanguage';

export const useParentsTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => {
    const relationshipOptions = [
      { value: 'father', label: t('parents.relationships.father') },
      { value: 'mother', label: t('parents.relationships.mother') },
      { value: 'guardian', label: t('parents.relationships.guardian') },
      { value: 'stepparent', label: t('parents.relationships.stepparent') },
      { value: 'grandparent', label: t('parents.relationships.grandparent') },
      { value: 'other', label: t('parents.relationships.other') },
    ];

    return [
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
      {
        name: 'relationshipType',
        placeholder: t('parents.filters.filterByRelationship'),
        type: 'select',
        options: relationshipOptions,
        className: 'w-full lg:w-48'
      }
    ];
  }, [t]);
};