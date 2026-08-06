import { useMemo } from 'react';
import { NBadge } from 'najm-kit';
import { STATUS_COLOR_MAP, STATUS_ICON_MAP } from '@/lib/statusBadge';
import { useTranslation } from '@/hooks/useLanguage';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { getCategoryClass } from '../lib/expenseCategoryStyles';

export const useExpensesTableColumns = () => {
  const { t } = useTranslation();
  const { publicSettings } = usePublicSettings();
  const currency = publicSettings?.currency || 'USD';

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
        return `${Number(amount).toFixed(2)} ${currency}`;
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
            {new Intl.DateTimeFormat('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }).format(new Date(date))}
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
        return <NBadge status={status} statusMap={STATUS_COLOR_MAP} iconMap={STATUS_ICON_MAP} showIcon />;
      },
    },
  ], [t, currency]);
};