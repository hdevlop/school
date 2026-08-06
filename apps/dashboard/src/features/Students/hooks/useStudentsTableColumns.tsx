import { useMemo } from 'react';
import { NAvatar } from 'najm-kit';
import { NBadge } from 'najm-kit';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';;
import { useTranslation } from '@/hooks/useLanguage';
import { studentAvatarClassNames } from '@/lib/avatar';

export const useStudentsTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: "studentCode",
      header: t('students.table.studentCode'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-medium text-sm">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: t('students.table.name'),
      cell: ({ row }) => {
        const student = row.original;
        return (
          <NAvatar
            src={student?.image}
            title={student.name}
            size="sm"
            version={student?.updatedAt}
            classNames={studentAvatarClassNames}
          />
        );
      },
      enableSorting: true,
      filterFn: (row, _id, value) => {
        const needle = String(value ?? '').toLowerCase().trim();
        if (!needle) return true;
        const name = String(row.original?.name ?? '').toLowerCase();
        const code = String(row.original?.studentCode ?? '').toLowerCase();
        return name.includes(needle) || code.includes(needle);
      },
    },
    {
      accessorKey: 'email',
      header: t('students.table.email'),
      enableSorting: false,
      cell: ({ getValue }) => {
        const email = getValue();
        return email || <span className="text-gray-400">{t('common.notAvailable')}</span>;
      },
    },
    {
      accessorKey: 'phone',
      header: t('students.table.phone'),
      enableSorting: false,
      cell: ({ getValue }) => {
        const phone = getValue();
        return phone || <span className="text-gray-400">{t('common.notAvailable')}</span>;
      },
    },
    {
      accessorKey: 'class',
      accessorFn: (row) => row.class?.name || '',
      header: t('students.table.class'),
      cell: ({ row }) => {
        const className = row.original.class?.name;
        return className || <span className="text-gray-400">{t('common.notAssigned')}</span>;
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: 'section',
      accessorFn: (row) => row.section?.name || '',
      header: t('students.table.section'),
      cell: ({ row }) => {
        const sectionName = row.original.section?.name;
        return sectionName || <span className="text-gray-400">{t('common.notAssigned')}</span>;
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "gender",
      header: t('students.table.gender'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const gender = getValue();
        if (!gender) return <span className="text-gray-400">{t('common.notSpecified')}</span>;
        return gender === 'M' ? t('common.male') : gender === 'F' ? t('common.female') : gender;
      },
    },
    {
      accessorKey: "status",
      header: t('students.table.status'),
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ getValue }) => {
        const status = getValue();
        return <NBadge statusMap={STATUS_COLOR_MAP} status={status} />;
      },
      size: 120,
    },
  ], [t]);
};
