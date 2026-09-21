import { useMemo } from 'react';
import { NAvatar, NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

export const useFeesTableColumns = () => {
  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();

  return useMemo(() => [
    {
      accessorKey: "student.studentCode",
      accessorFn: (row: any) => row.student?.studentCode || '',
      header: t('fees.table.studentCode'),
      cell: ({ row }: any) => {
        const studentCode = row.original.student?.studentCode;
        return <span className="font-medium">{studentCode || '-'}</span>;
      },
      enableSorting: true,
    },
    {
      accessorKey: "student",
      accessorFn: (row: any) => row.student?.name || '',
      header: t('fees.table.student'),
      cell: ({ row }: any) => {
        const student = row.original.student;
        return student ? (
          <NAvatar src={student.image} title={student.name} size='sm' version={student?.updatedAt} />
        ) : (
          <span className="text-gray-400">{t('common.notAvailable')}</span>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "netAmount",
      header: t('fees.table.netAmount'),
      enableSorting: true,
      cell: ({ row }: any) => {
        const amount = row.original.netAmount || '0';
        return majorMoney(amount);
      },
    },
    {
      accessorKey: "totalPaid",
      header: t('fees.table.paidAmount'),
      enableSorting: true,
      cell: ({ row }: any) => {
        const amount = row.original.totalPaid || '0';
        return (
          <span className="text-green-600 font-medium">
            {majorMoney(amount)}
          </span>
        );
      },
    },
    {
      accessorKey: "totalDue",
      header: t('fees.table.dueAmount'),
      enableSorting: true,
      cell: ({ row }: any) => {
        const amount = row.original.totalDue || '0';
        const numAmount = Number(amount);
        return (
          <span className={numAmount > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
            {majorMoney(numAmount)}
          </span>
        );
      },
    },
    {
      id: "status",
      accessorFn: (row: any) => {
        if (row.overdueCount > 0) return 'overdue';
        if (Number(row.totalDue ?? 0) <= 0) return 'paid';
        return 'paying';
      },
      header: t('fees.table.status'),
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }: any) => {
        const overdue = row.original.overdueCount || 0;
        const totalDue = Number(row.original.totalDue ?? 0);

        if (overdue > 0) {
          return <NBadge status="overdue" size="md" look="solid" showIcon>{overdue} {t('fees.status.overdue')}</NBadge>;
        }

        if (totalDue <= 0) {
          return <NBadge status="paid" size="md" look="solid" showIcon>{t('fees.status.paid')}</NBadge>;
        }

        return <NBadge status="processing" size="md" look="solid" showIcon>{t('fees.status.paying') || 'Paying'}</NBadge>;
      },
      size: 160,
    },
  ], [t, majorMoney]);
};
