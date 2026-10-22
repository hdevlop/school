import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { academicLevelLabel, compareAcademicLevels } from '@sms/contracts';
import { useCycles } from '@/features/Cycles/hooks/useCycles';

export const useClassesTableColumns = () => {
  const { t, language } = useTranslation();
  const { cycles } = useCycles();

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
      sortingFn: (left, right, id) => compareAcademicLevels(String(left.getValue(id) ?? ''), String(right.getValue(id) ?? ''), language),
      sortDescFirst: false,
      header: t('classes.table.level'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const level = getValue();
        return level ? academicLevelLabel(level, language) : <span className="text-gray-400">{t('common.notSpecified')}</span>;
      },
    },
    {
      id: 'cycle',
      header: t('classes.form.cycle'),
      accessorFn: row => {
        const cycle = cycles?.find(cycle => cycle.id === row.cycleId);
        return cycle?.labels?.[language] || cycle?.name || t('common.notAssigned');
      },
      enableSorting: true,
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
  ], [t, language, cycles]);
};
