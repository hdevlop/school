import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useLanguage';

export const useSubjectsTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: "id",
      header: t('subjects.table.id'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-mono text-xs text-muted-foreground">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "code",
      header: t('subjects.table.code'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-medium text-sm uppercase">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: t('subjects.table.name'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-medium text-sm">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: t('subjects.table.description'),
      enableSorting: false,
      cell: ({ getValue }) => {
        const description = getValue();
        if (!description) return <span className="text-gray-400">{t('common.noDescription')}</span>;
        return (
          <div className="text-sm text-muted-foreground max-w-xs truncate">
            {description}
          </div>
        );
      },
    },
  ], [t]);
};