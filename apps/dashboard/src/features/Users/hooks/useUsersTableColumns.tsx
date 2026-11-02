import { useMemo } from 'react';
import { NAvatar } from 'najm-kit';
import { NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { avatarVersion } from '@/lib/avatarVersion';
import { exportStatus } from '@/shared/tableExport';
import { matchesEmailOrPhone } from '../config/accountLinks';

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
        return <NAvatar src={user.image} title={user.name} version={avatarVersion(user.image, user?.updatedAt)} />;
      },
      enableSorting: true,
    },
    {
      accessorKey: 'email',
      header: t('users.table.email'),
      enableSorting: false,
      // Most accounts sign in by phone and have no email, so the email search
      // matches either. Left on 'auto', TanStack picked the filter from the
      // first row's value, and a null there made it an exact match.
      filterFn: (row, _columnId, search) => matchesEmailOrPhone(row.original, search),
    },
    {
      accessorKey: 'role',
      header: t('users.table.role'),
    },
    {
      accessorKey: "status",
      meta: { exportValue: exportStatus(t) },
      header: t('users.table.status'),
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ getValue }) => {
        const status = getValue();
        return <NBadge status={status} />;
      },
      size: 120,
    },
  ], [t]);
};
