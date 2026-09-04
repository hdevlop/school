import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

export const useClassesTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: "id",
      header: t('classes.table.id'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-mono text-xs text-muted-foreground">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: t('classes.table.className'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-medium text-sm">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "academicYear",
      header: t('classes.table.academicYear'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="text-sm">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "level",
      header: t('classes.table.level'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const level = getValue();
        return level || <span className="text-gray-400">{t('common.notSpecified')}</span>;
      },
    },
    {
      accessorKey: "description",
      header: t('classes.table.description'),
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