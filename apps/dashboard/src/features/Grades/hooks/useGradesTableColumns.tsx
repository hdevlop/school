import { useMemo } from 'react';
import { NBadge, NButton } from 'najm-kit';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';;
import { NAvatar } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';
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
}: {
  canEdit: (row: any) => boolean;
  onToggleStatus: (row: any) => void | Promise<void>;
}) => {
  const { t } = useTranslation();

  return useMemo(() => [
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
      header: t('grades.table.student'),
      enableSorting: false,
      cell: ({ row }) => {
        const name = row.original.studentName;
        const image = row.original.studentImage;
        const updatedAt = row.original.studentUpdatedAt;
        if (!name) return <span className="text-gray-400">{t('common.notAssigned')}</span>;
        return <NAvatar src={image} title={name} size="sm" version={updatedAt} />;
      },
      filterFn: (row, _id, value) => {
        const needle = String(value ?? '').toLowerCase().trim();
        if (!needle) return true;
        const name = String(row.original?.studentName ?? '').toLowerCase();
        const code = String(row.original?.studentCode ?? '').toLowerCase();
        return name.includes(needle) || code.includes(needle);
      },
    },
    {
      accessorKey: 'gender',
      header: t('grades.table.gender'),
      enableSorting: true,
      cell: ({ row }) => {
        const gender = row.original.gender;
        if (!gender) return <span className="text-gray-400">{t('common.notSpecified')}</span>;
        return gender === 'M' ? t('common.male') : gender === 'F' ? t('common.female') : gender;
      },
    },
    {
      accessorKey: 'phone',
      header: t('grades.table.phone'),
      enableSorting: false,
      cell: ({ row }) => {
        const phone = row.original.phone;
        return phone || <span className="text-gray-400">{t('common.notAvailable')}</span>;
      },
    },
    {
      accessorKey: 'className',
      header: t('grades.table.class'),
      enableSorting: false,
      cell: ({ row }) => {
        const className = row.original.className;
        return className || <span className="text-gray-400">{t('common.notAssigned')}</span>;
      },
    },
    {
      accessorKey: 'sectionName',
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
      meta: {
        editable: canEdit,
        editor: 'number',
        min: 0,
        max: ({ totalMarks }) => totalMarks ?? 100,
        step: 0.5,
        validate: (v, row) => {
          if (v == null || v === '') return null;
          if (v < 0) return 'Must be ≥ 0';
          if (row.totalMarks != null && v > row.totalMarks) return `Max ${row.totalMarks}`;
          return null;
        },
      },
      cell: ({ row }) => {
        const obtained = row.original.marksObtained;
        const total = row.original.totalMarks;
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
      header: t('grades.table.status'),
      enableSorting: false,
      cell: ({ row, getValue }) => {
        const v = (getValue() as string) || 'pending';
        const isToggleable = v === 'pending' || v === 'missed';
        const canToggleStatus = canEdit(row.original) && isToggleable;
        return (
          <div className="flex items-center gap-2">
            {canToggleStatus ? (
              <NButton
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 rounded-full px-1 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring"
                title={v === 'pending' ? t('grades.status.missed') : t('grades.status.pending')}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleStatus(row.original);
                }}
              >
                <NBadge statusMap={STATUS_COLOR_MAP} status={v} />
              </NButton>
            ) : (
              <NBadge statusMap={STATUS_COLOR_MAP} status={v} />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'feedback',
      header: t('grades.table.feedback'),
      enableSorting: false,
      meta: {
        editable: canEdit,
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
  ], [t, canEdit, onToggleStatus]);
};
