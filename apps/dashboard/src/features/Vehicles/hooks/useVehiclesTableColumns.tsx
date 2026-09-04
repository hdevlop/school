import { useMemo } from 'react';
import { Badge } from 'najm-kit';
import { NBadge } from 'najm-kit';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';;
import { useTranslation } from 'najm-i18n/react';

export const useVehiclesTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: "id",
      header: t('vehicles.table.id'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-mono text-xs text-muted-foreground">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: t('vehicles.table.name'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-medium text-sm">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "brand",
      header: t('vehicles.table.brand'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="text-sm">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "model",
      header: t('vehicles.table.model'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="text-sm">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "licensePlate",
      header: t('vehicles.table.licensePlate'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-medium text-sm uppercase bg-secondary/50 text-black px-2 py-1 rounded">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: t('vehicles.table.type'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const type = getValue();
        return (
          <Badge variant="outline">
            {type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "capacity",
      header: t('vehicles.table.capacity'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="text-sm">
          {getValue()} {t('vehicles.table.seats')}
        </div>
      ),
    },
    {
      accessorKey: "driver.name",
      header: t('vehicles.table.driver'),
      enableSorting: true,
      cell: ({ row }) => {
        const driverName = row.original.driver?.name;
        return (
          <div className="text-sm font-medium hover:underline">
            {driverName || <span className="text-muted-foreground italic">{t('vehicles.table.noDriver')}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: t('vehicles.table.status'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const status = getValue();
        return <NBadge statusMap={STATUS_COLOR_MAP} status={status} />;
      },
    },
  ], [t]);
};