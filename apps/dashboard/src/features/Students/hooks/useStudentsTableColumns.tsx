import { useMemo } from 'react';
import { NAvatar } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { ColumnDef } from '@tanstack/react-table';
import { avatarVersion } from '@/lib/avatarVersion';

export const useStudentsTableColumns = () => {
  const { t } = useTranslation();

  return useMemo<ColumnDef<any, any>[]>(() => [
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
      header: () => <span className="student-name-column">{t('students.table.name')}</span>,
      cell: ({ row }) => {
        const student = row.original;
        return (
          <NAvatar
            src={student?.image}
            title={student.name}
            size="sm"
            version={avatarVersion(student?.image, student?.updatedAt)}
          />
        );
      },
      enableSorting: true,
      filterFn: (row, _id, value) => {
        const needle = String(value ?? '').toLowerCase().trim();
        if (!needle) return true;
        const name = String(row.original?.name ?? '').toLowerCase();
        const code = String(row.original?.studentCode ?? '').toLowerCase();
        const arabicName = String(row.original?.arabicName ?? '').toLowerCase();
        return name.includes(needle) || code.includes(needle) || arabicName.includes(needle);
      },
    },
    {
      accessorKey: 'arabicName',
      header: () => <span className="student-arabic-name-column">{t('students.form.arabicName')}</span>,
      cell: ({ getValue }) => <span lang="ar" dir="rtl">{getValue() || ''}</span>,
    },
    {
      accessorKey: 'email',
      header: () => <span className="student-email-column">{t('students.table.email')}</span>,
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
      header: () => <span className="student-class-column">{t('students.table.class')}</span>,
      cell: ({ row }) => {
        const className = row.original.class?.name;
        return className || <span className="text-gray-400">{t('common.notAssigned')}</span>;
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: 'section',
      accessorFn: (row) => row.section?.name || '',
      header: () => <span className="student-section-column">{t('students.table.section')}</span>,
      cell: ({ row }) => {
        const sectionName = row.original.section?.name;
        return sectionName || <span className="text-gray-400">{t('common.notAssigned')}</span>;
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "gender",
      header: () => <span className="student-gender-column">{t('students.table.gender')}</span>,
      enableSorting: true,
      cell: ({ getValue }) => {
        const gender = getValue();
        if (!gender) return <span className="text-gray-400">{t('common.notSpecified')}</span>;
        return gender === 'M' ? t('common.male') : gender === 'F' ? t('common.female') : gender;
      },
    },
  ], [t]);
};
