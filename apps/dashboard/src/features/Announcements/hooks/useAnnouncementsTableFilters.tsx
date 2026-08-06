import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useLanguage';

export const useAnnouncementsTableFilters = () => {
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
      name: 'isPublished',
      placeholder: t('announcements.filters.filterByStatus'),
      type: 'select',
      options: [
        { value: 'true', label: t('announcements.status.published') },
        { value: 'false', label: t('announcements.status.draft') },
      ],
    },
  ], [t]);
};
