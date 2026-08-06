import { useMemo } from 'react';
import { NAvatar } from 'najm-kit';
import { NBadge } from 'najm-kit';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';;
import { useTranslation } from '@/hooks/useLanguage';

export const useUsersTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: "id",
      header: t('users.table.id'),
      enableSorting: true,
      enableColumnFilter: false,
      cell: ({ getValue }) => (
        <div className="text-sm text-gray-500">
          #{getValue()}
        </div>
      ),
      size: 80,
    },
    {
      accessorKey: "name",
      header: t('users.table.name'),
      cell: ({ row }) => {
        const user = row.original;
        return <NAvatar src={user.image} title={user.name} version={user?.updatedAt} />;
      },
      enableSorting: true,
    },
    {
      accessorKey: 'email',
      header: t('users.table.email'),
      enableSorting: false,
    },
    {
      accessorKey: 'role',
      header: t('users.table.role'),
    },
    {
      accessorKey: "status",
      header: t('users.table.status'),
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ getValue }) => {
        const status = getValue();
        return <NBadge statusMap={STATUS_COLOR_MAP} status={status} />;
      },
      size: 120,
    },
  ], [t]);
};
