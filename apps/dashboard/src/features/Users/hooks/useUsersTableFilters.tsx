import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useRoles } from '@/features/Roles/hooks/useRoles';

export const useUsersTableFilters = () => {
  const { t } = useTranslation();
  const { roles } = useRoles();

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
      // Each row's `role` column holds the role's name, so the options are the
      // school's own roles rather than a fixed list.
      type: "select",
      showIcon: false,
      name: "role",
      placeholder: t('users.filters.filterByRole'),
      options: (roles ?? []).map((role) => ({ value: role.name, label: role.name })),
    },
  ], [t, roles]);
};
