import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

export const useUsersTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      type: "text",
      name: "name",
      placeholder: t('users.filters.searchByName'),
    },
    {
      type: "text",
      name: "email",
      placeholder: t('users.filters.searchByEmail'),
    },
    {
      type: "select",
      name: "roleName",
      placeholder: t('users.filters.filterByRole'),
      options: [
        { value: "admin", label: t('users.roles.admin') },
        { value: "user", label: t('users.roles.user') },
        { value: "moderator", label: t('users.roles.moderator') },
      ],
    },
  ], [t]);
};