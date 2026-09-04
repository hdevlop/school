import { useMemo } from 'react';
import { NAvatar } from 'najm-kit';
import { NBadge } from 'najm-kit';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';;
import { useTranslation } from 'najm-i18n/react';
import { personAvatarClassNames } from '@/lib/avatar';

export const useTeachersTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: "name",
      header: t('teachers.table.name'),
      cell: ({ row }) => {
        const teacher = row.original;
        return <NAvatar src={teacher?.image} title={teacher.name} size='sm' version={teacher?.updatedAt} classNames={personAvatarClassNames} />;
      },
      enableSorting: true,
    },
    {
      accessorKey: 'email',
      header: t('teachers.table.email'),
      enableSorting: false,
      cell: ({ getValue }) => {
        const email = getValue();
        return email || <span className="text-gray-400">{t('common.notAvailable')}</span>;
      },
    },
    {
      accessorKey: 'phone',
      header: t('teachers.table.phone'),
      enableSorting: false,
      cell: ({ getValue }) => {
        const phone = getValue();
        return phone || <span className="text-gray-400">{t('common.notAvailable')}</span>;
      },
    },
    {
      accessorKey: "specialization",
      header: t('teachers.table.specialization'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const specialization = getValue();
        return specialization || <span className="text-gray-400">{t('common.notSpecified')}</span>;
      },
    },
    {
      accessorKey: "cin",
      header: t('teachers.table.cin'),
      enableSorting: false,
      cell: ({ getValue }) => {
        const cin = getValue();
        return cin || <span className="text-gray-400">{t('common.notAvailable')}</span>;
      },
    },
    {
      accessorKey: "hireDate",
      header: t('teachers.table.hireDate'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const hireDate = getValue();
        if (!hireDate) return <span className="text-gray-400">{t('common.notAvailable')}</span>;
        return new Date(hireDate).toLocaleDateString();
      },
    },
    {
      accessorKey: "status",
      header: t('teachers.table.status'),
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
