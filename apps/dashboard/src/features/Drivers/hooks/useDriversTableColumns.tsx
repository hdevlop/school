import { useMemo } from 'react';
import { NAvatar } from 'najm-kit';
import { NBadge } from 'najm-kit';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';;
import { useTranslation } from 'najm-i18n/react';

export const useDriversTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: "name",
      header: t('drivers.table.name'),
      cell: ({ row }) => {
        const driver = row.original;
        return <NAvatar src={driver?.image} title={driver.name} size='sm' version={driver?.updatedAt} />;
      },
      enableSorting: true,
    },
    {
      accessorKey: 'email',
      header: t('drivers.table.email'),
      enableSorting: false,
      cell: ({ getValue }) => {
        const email = getValue();
        return email || <span className="text-gray-400">{t('common.notAvailable')}</span>;
      },
    },
    {
      accessorKey: 'phone',
      header: t('drivers.table.phone'),
      enableSorting: false,
      cell: ({ getValue }) => {
        const phone = getValue();
        return phone || <span className="text-gray-400">{t('common.notAvailable')}</span>;
      },
    },
    {
      accessorKey: "licenseNumber",
      header: t('drivers.table.licenseNumber'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const licenseNumber = getValue();
        return licenseNumber || <span className="text-gray-400">{t('common.notAvailable')}</span>;
      },
    },
    {
      accessorKey: "licenseType",
      header: t('drivers.table.licenseType'),
      enableSorting: false,
      cell: ({ getValue }) => {
        const licenseType = getValue();
        return licenseType || <span className="text-gray-400">{t('common.notSpecified')}</span>;
      },
    },
    {
      accessorKey: "licenseExpiry",
      header: t('drivers.table.licenseExpiry'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const licenseExpiry = getValue();
        if (!licenseExpiry) return <span className="text-gray-400">{t('common.notAvailable')}</span>;

        const expiryDate = new Date(licenseExpiry);
        const today = new Date();
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let colorClass = '';
        if (daysUntilExpiry < 0) {
          colorClass = 'text-red-600 font-semibold';
        } else if (daysUntilExpiry < 30) {
          colorClass = 'text-orange-600 font-semibold';
        }

        return <span className={colorClass}>{expiryDate.toLocaleDateString()}</span>;
      },
    },
    {
      accessorKey: "hireDate",
      header: t('drivers.table.hireDate'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const hireDate = getValue();
        if (!hireDate) return <span className="text-gray-400">{t('common.notAvailable')}</span>;
        return new Date(hireDate).toLocaleDateString();
      },
    },
    {
      accessorKey: "status",
      header: t('drivers.table.status'),
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
