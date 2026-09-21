import { useMemo } from 'react';
import { NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { getCategoryClass } from '../lib/expenseCategoryStyles';

export const useExpensesTableColumns = () => {
  const { t } = useTranslation();
  const { majorMoney, displayDate } = useSchoolFormat();

  return useMemo(() => [
    {
      accessorKey: "id",
      header: t('expenses.table.id'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-mono text-xs text-muted-foreground">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: t('expenses.table.category'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const category = getValue();
        return (
          <NBadge look="outline" className={`border ${getCategoryClass(category)}`}>
            {t(`expenses.categories.${category}`)}
          </NBadge>
        );
      },
    },
    {
      accessorKey: "title",
      header: t('expenses.table.title'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-medium text-sm">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: t('expenses.table.amount'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const amount = getValue();
        return majorMoney(amount);
      },
    },
    {
      accessorKey: "expenseDate",
      header: t('expenses.table.expenseDate'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const date = getValue();
        return (
          <div className="text-sm">
            {displayDate(date)}
          </div>
        );
      },
    },
    {
      accessorKey: "paymentMethod",
      header: t('expenses.table.paymentMethod'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const method = getValue();
        return (
          <div className="text-sm">
            {method ? t(`expenses.paymentMethods.${method}`) : (
              <span className="text-muted-foreground italic">{t('expenses.table.notSpecified')}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: t('expenses.table.status'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const status = getValue();
        return <NBadge status={status} showIcon />;
      },
    },
  ], [t, majorMoney, displayDate]);
};
