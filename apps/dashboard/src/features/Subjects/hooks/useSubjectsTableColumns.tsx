import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

export const useSubjectsTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: "id",
      size: 90,
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
      size: 100,
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
      size: 240,
      filterFn: (row, _columnId, value) => [row.original.name, row.original.nameAr, row.original.code]
        .some(field => String(field ?? '').toLocaleLowerCase().includes(String(value ?? '').trim().toLocaleLowerCase())),
      header: t('subjects.table.name'),
      enableSorting: true,
      // The Arabic name, when set, under the school's.
      cell: ({ getValue, row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-medium text-sm">{getValue()}</span>
          {row.original.nameAr && <bdi dir="rtl" className="truncate text-xs text-muted-foreground">{row.original.nameAr}</bdi>}
        </div>
      ),
    },
    {
      accessorKey: "description",
      size: 260,
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
