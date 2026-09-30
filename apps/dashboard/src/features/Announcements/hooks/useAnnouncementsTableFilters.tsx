import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

export const useAnnouncementsTableFilters = (classFilter = '', onClassFilterChange?: (value: string) => void, classes: Array<{ id: string; name: string }> = []) => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      name: 'title',
      placeholder: t('announcements.filters.searchByTitle'),
      type: 'text',
    },
    {
      name: 'targetAudience',
      placeholder: t('announcements.filters.filterByAudience'),
      type: 'select',
      options: [
        { value: 'all', label: t('announcements.audience.all') },
        { value: 'students', label: t('announcements.audience.students') },
        { value: 'teachers', label: t('announcements.audience.teachers') },
        { value: 'parents', label: t('announcements.audience.parents') },
        { value: 'class', label: t('announcements.audience.class') },
      ],
    },
    {
      name: 'classScope',
      placeholder: t('students.filters.filterByClass'),
      type: 'combobox',
      options: classes.map((item) => ({ value: item.id, label: item.name })),
      value: classFilter,
      onChange: onClassFilterChange,
      className: 'w-full lg:w-48',
    },
    {
      name: 'isPublished',
      placeholder: t('announcements.filters.filterByStatus'),
      type: 'select',
      options: [
        { value: 'true', label: t('announcements.status.published') },
        { value: 'false', label: t('announcements.status.draft') },
      ],
    },
  ], [t, classFilter, onClassFilterChange, classes]);
};
