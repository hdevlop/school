import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useRoles } from '@/features/Roles/hooks/useRoles';
import type { LinkedToFilter } from '../config/accountLinks';
import { buildLinkedToOptions } from '../config/userOptions';

/** `linkedTo` is absent while the account links are unknown: the filter then has nothing to filter on. */
export const useUsersTableFilters = (linkedTo?: { value: LinkedToFilter; onChange: (value: LinkedToFilter) => void }) => {
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
      placeholder: t('users.filters.searchByEmailOrPhone'),
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
    ...(linkedTo ? [{
      type: "select",
      showIcon: false,
      name: "linkedTo",
      placeholder: t('users.filters.linkedTo'),
      value: linkedTo.value,
      onChange: (value: string) => linkedTo.onChange((value || '__all__') as LinkedToFilter),
      options: buildLinkedToOptions(t),
    }] : []),
  ], [t, roles, linkedTo]);
};
