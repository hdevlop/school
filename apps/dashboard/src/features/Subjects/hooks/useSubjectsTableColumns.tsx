import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { SubSubjectTags } from '../components/SubSubjectsEditor';

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
      filterFn: (row, _columnId, value) => [row.original.name, row.original.code]
        .some(field => String(field ?? '').toLocaleLowerCase().includes(String(value ?? '').trim().toLocaleLowerCase())),
      header: t('subjects.table.name'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-medium text-sm">
          {getValue()}
        </div>
      ),
    },
    {
      id: "subSubjects",
      size: 480,
      accessorFn: (row) => (row.subSubjects ?? []).map(part => part.name).join(' '),
      header: t('subjects.table.subSubjects'),
      enableSorting: false,
      // One line: as many as the column holds, then +N; a row click opens the subject with all of them.
      cell: ({ row }) => <SubSubjectTags items={row.original.subSubjects} oneLine />,
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
