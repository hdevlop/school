import { useMemo } from 'react';
import { NAvatar, NBadge, NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat, useSchoolToday } from '@/hooks/useSchoolFormat';
import { CHECK_STATUS_COLOR, nextCheckStep } from '../config/checkStatus';

type Options = {
  busyId: string | null;
  /** A bulk run is moving the selected checks; no single check may move meanwhile. */
  disabled?: boolean;
  onAdvance: (payment: any) => void;
};

export const usePendingChecksTableColumns = ({ busyId, disabled = false, onAdvance }: Options) => {
  const { t } = useTranslation();
  const { displayDateOnly, majorMoney } = useSchoolFormat();
  const today = useSchoolToday();

  return useMemo(() => [
    {
      id: 'student',
      // Name and code, so the table search finds either.
      accessorFn: (payment: any) => `${payment.student?.name ?? ''} ${payment.student?.studentCode ?? ''}`,
      header: t('payments.table.student'),
      enableSorting: true,
      cell: ({ row }: any) => {
        const student = row.original.student;
        return (
          <div className="flex min-w-0 items-center gap-2">
            <NAvatar src={student?.image} fallback={student?.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-medium">{student?.name ?? row.original.studentId}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'studentCode',
      accessorFn: (payment: any) => payment.student?.studentCode ?? '',
      header: t('payments.table.studentCode'),
      enableSorting: true,
      cell: ({ getValue }: any) => <span className="font-mono text-sm">{getValue() || '—'}</span>,
    },
    {
      accessorKey: 'checkNumber',
      header: t('payments.table.checkNumber'),
      enableSorting: true,
      cell: ({ row }: any) => (
        <div className="min-w-0">
          <p className="font-mono text-sm">{row.original.checkNumber}</p>
          {row.original.checkBank && <p className="truncate text-xs text-muted-foreground">{row.original.checkBank}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'checkDueDate',
      header: t('payments.table.checkDueDate'),
      enableSorting: true,
      cell: ({ getValue }: any) => {
        const due = getValue();
        const overdue = Boolean(due) && due < today;
        return (
          <div className="flex flex-col items-start gap-0.5">
            <span className={overdue ? 'font-medium text-destructive' : ''}>{due ? displayDateOnly(due) : '—'}</span>
            {overdue && <span className="text-xs text-destructive">{t('status.overdue')}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: t('payments.table.amount'),
      enableSorting: true,
      sortingFn: (left: any, right: any) => Number(left.original.amount) - Number(right.original.amount),
      cell: ({ getValue }: any) => <span className="font-semibold tabular-nums">{majorMoney(Number(getValue() || 0))}</span>,
    },
    {
      accessorKey: 'status',
      header: t('payments.table.status'),
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ getValue }: any) => (
        <NBadge status={getValue()} statusMap={CHECK_STATUS_COLOR} label={t(`financialOperations.checkStatuses.${getValue()}`)} />
      ),
    },
    {
      id: 'advance',
      header: '',
      enableSorting: false,
      cell: ({ row }: any) => {
        const step = nextCheckStep(row.original.status);
        if (!step) return null;
        return (
          <NButton
            size="sm"
            disabled={disabled || busyId === row.original.id}
            onClick={(event) => {
              event.stopPropagation();
              onAdvance(row.original);
            }}
          >
            {t(step.labelKey)}
          </NButton>
        );
      },
    },
  ], [t, today, displayDateOnly, majorMoney, busyId, disabled, onAdvance]);
};
