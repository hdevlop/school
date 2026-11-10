import { useMemo } from 'react';
import { GradeMarkField } from '../components/GradeMarkField';
import { GradeStatus } from '../components/GradeStatus';
import { NAvatar } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { avatarVersion } from '@/lib/avatarVersion';
import { exportStatus } from '@/shared/tableExport';
const computePercent = (obtained, total) => {
  if (obtained == null || total == null) return null;
  const o = Number(obtained);
  const t = Number(total);
  if (!t || isNaN(o) || isNaN(t)) return null;
  return Math.round((o / t) * 100);
};

export const useGradesTableColumns = ({
  canEdit,
  onToggleStatus,
  onEdit,
  allowFeedback = true,
}: {
  canEdit: (row: any) => boolean;
  onToggleStatus: (row: any) => void | Promise<void>;
  /** A mark typed in its field: saved shortly after, without a button. */
  onEdit: (row: any, columnId: string, value: unknown) => void | Promise<void>;
  allowFeedback?: boolean;
}) => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: 'studentArabicName',
      header: t('grades.table.arabicName'),
      enableSorting: false,
      cell: ({ row }) => {
        const arabicName = row.original.studentArabicName;
        return arabicName ? (
          <bdi lang="ar" className="font-normal text-sm">{arabicName}</bdi>
        ) : (
          <span className="text-gray-400">—</span>
        );
      },
    },
    {
      id: 'studentCode',
      accessorKey: 'studentCode',
      header: t('grades.table.studentCode'),
      enableSorting: true,
      cell: ({ row }) => {
        const code = row.original.studentCode;
        return code ? (
          <div className="font-medium text-sm">{code}</div>
        ) : (
          <span className="text-gray-400">—</span>
        );
      },
    },
    {
      accessorKey: 'studentName',
      header: () => <span className="grade-student-name-column">{t('grades.table.student')}</span>,
      meta: { exportHeader: t('grades.table.student') },
      enableSorting: false,
      cell: ({ row }) => {
        const name = row.original.studentName;
        const image = row.original.studentImage;
        const updatedAt = row.original.studentUpdatedAt;
        if (!name) return <span className="text-gray-400">{t('common.notAssigned')}</span>;
        return (
          <NAvatar
            src={image}
            title={name}
            size="sm"
            version={avatarVersion(image, updatedAt)}
            classNames={{ title: 'whitespace-normal break-words' }}
          />
        );
      },
      filterFn: (row, _id, value) => {
        const needle = String(value ?? '').toLowerCase().trim();
        if (!needle) return true;
        const name = String(row.original?.studentName ?? '').toLowerCase();
        const code = String(row.original?.studentCode ?? '').toLowerCase();
        const arabicName = String(row.original?.studentArabicName ?? '');
        return name.includes(needle) || code.includes(needle) || arabicName.includes(needle);
      },
    },
    {
      accessorKey: 'gender',
      // Secondary to grading: shown only where the table has room, so names never truncate.
      meta: { hiddenBelow: '2xl' },
      header: t('grades.table.gender'),
      enableSorting: true,
      cell: ({ row }) => {
        const gender = row.original.gender;
        if (!gender) return <span className="text-gray-400">{t('common.notSpecified')}</span>;
        return gender === 'M' ? t('common.male') : gender === 'F' ? t('common.female') : gender;
      },
    },
    {
      accessorKey: 'className',
      // Secondary to grading: shown only where the table has room, so names never truncate.
      meta: { hiddenBelow: '2xl' },
      header: t('grades.table.class'),
      enableSorting: false,
      cell: ({ row }) => {
        const className = row.original.className;
        return className || <span className="text-gray-400">{t('common.notAssigned')}</span>;
      },
    },
    {
      accessorKey: 'sectionName',
      // Secondary to grading: shown only where the table has room, so names never truncate.
      meta: { hiddenBelow: '2xl' },
      header: t('grades.table.section'),
      enableSorting: false,
      cell: ({ row }) => {
        const sectionName = row.original.sectionName;
        return sectionName || <span className="text-gray-400">{t('common.notAssigned')}</span>;
      },
    },
    {
      accessorKey: 'marksObtained',
      header: t('grades.table.marksObtained'),
      enableSorting: false,
      // Always a field, like a Massar grid cell, for whoever may grade the row.
      cell: ({ row }) => {
        const obtained = row.original.marksObtained;
        const total = row.original.totalMarks;
        if (canEdit(row.original)) return (
          <GradeMarkField value={obtained} total={total} label={`${row.original.studentName} · ${t('grades.table.marksObtained')}`}
            onChange={(value) => { void onEdit(row.original, 'marksObtained', value); }} />
        );
        return (
          <div className="text-sm">
            <span className="font-medium">{obtained ?? '—'}</span>
            {total != null && <span className="text-xs text-gray-500"> / {total}</span>}
          </div>
        );
      },
    },
    {
      id: 'percentage',
      header: t('grades.table.percentage'),
      enableSorting: false,
      cell: ({ row }) => {
        const pct = computePercent(row.original.marksObtained, row.original.totalMarks);
        if (pct == null) return <span className="text-gray-400">—</span>;
        const color = pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-rose-600';
        return <div className={`text-sm font-medium ${color}`}>{pct}%</div>;
      },
    },
    {
      accessorKey: 'status',
      meta: { exportValue: exportStatus(t) },
      header: t('grades.table.status'),
      enableSorting: false,
      cell: ({ row, getValue }) => (
        <div className="flex min-h-7 items-center">
          <GradeStatus status={getValue() as string} editable={canEdit(row.original)} onToggle={() => onToggleStatus(row.original)} />
        </div>
      ),
    },
    {
      accessorKey: 'feedback',
      header: t('grades.table.feedback'),
      enableSorting: false,
      meta: {
        editable: (row) => allowFeedback && canEdit(row),
        editor: 'text',
      },
      cell: ({ getValue }) => {
        const fb = getValue() as string;
        if (!fb) return <span className="text-gray-400">—</span>;
        return (
          <div className="text-sm text-gray-700 truncate max-w-xs" title={fb}>{fb}</div>
        );
      },
    },
  ], [t, canEdit, onToggleStatus, onEdit, allowFeedback]);
};
