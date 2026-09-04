'use client'
import { useMemo } from 'react';
import { Badge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

export const usePermissionsTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(() => [

    {
      accessorKey: "name",
      header: t('permissions.table.name'),
      enableSorting: true,
      enableColumnFilter: false,
      cell: (info) => (
        <div className="font-medium">
          {info.getValue()}
        </div>
      ),
      size: 200,
    },

    {
      accessorKey: "resource",
      header: t('permissions.table.resource'),
      enableSorting: true,
      enableColumnFilter: false,
      cell: (info) => (
        <Badge variant="outline" className="text-xs font-mono">
          {info.getValue()}
        </Badge>
      ),
      size: 140,
    },

    {
      accessorKey: "action",
      header: t('permissions.table.action'),
      enableSorting: true,
      enableColumnFilter: false,
      cell: (info) => (
        <Badge variant="outline" className="text-xs font-mono">
          {info.getValue()}
        </Badge>
      ),
      size: 140,
    },

    {
      accessorKey: "description",
      header: t('permissions.table.description'),
      enableColumnFilter: false,
      cell: (info) => (
        <div className="text-muted-foreground max-w-[300px] truncate">
          {info.getValue() || t('permissions.table.noDescription')}
        </div>
      ),
      size: 280,
    },

  ], [t]);
};
