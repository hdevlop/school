'use client'
import { useCallback, useMemo } from 'react';
import { Button } from 'najm-kit';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/hooks/useLanguage';

export const useRolesTableColumns = (onManagePermissions?: (role: any) => void) => {
  const { t } = useTranslation();
  const tf = useCallback((key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  }, [t]);

  return useMemo(() => [

    {
      accessorKey: "id",
      header: t('roles.table.id'),
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
      header: t('roles.table.roleName'),
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
      accessorKey: "description",
      header: t('roles.table.description'),
      cell: (info) => (
        <div className="text-muted-foreground max-w-[300px] truncate">
          {info.getValue() || t('roles.table.noDescription')}
        </div>
      ),
      size: 300,
    },

    {
      id: "permissions",
      header: tf('permissions.manage.columnHeader', 'Permissions'),
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={(e) => {
            e.stopPropagation();
            onManagePermissions?.(row.original);
          }}
        >
          <ShieldCheck className="h-4 w-4" />
          {tf('permissions.manage.manageButton', 'Manage')}
        </Button>
      ),
      size: 140,
    },

  ], [t, tf, onManagePermissions]);
};