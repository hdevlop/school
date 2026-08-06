import { useMemo } from 'react';
import { Badge } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';

export const useCyclesTableColumns = () => {
  const { t, language } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: 'id',
      header: t('cycles.table.id'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-mono text-xs text-muted-foreground">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: t('cycles.table.name'),
      enableSorting: true,
      cell: ({ row }) => (
        <div className="font-medium text-sm">
          {row.original?.labels?.[language] || row.original?.name}
        </div>
      ),
    },
    {
      accessorKey: 'sortOrder',
      header: t('cycles.table.sortOrder'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{getValue() ?? 0}</span>
      ),
    },
    {
      accessorKey: 'active',
      header: t('cycles.table.status'),
      enableSorting: true,
      cell: ({ getValue }) => (
        getValue()
          ? <Badge className="bg-emerald-100 text-emerald-700">{t('status.active')}</Badge>
          : <Badge className="bg-slate-200 text-slate-700">{t('status.inactive')}</Badge>
      ),
    },
  ], [t, language]);
};
