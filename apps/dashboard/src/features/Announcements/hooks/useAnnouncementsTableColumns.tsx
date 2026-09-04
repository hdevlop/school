import { useMemo } from 'react';
import { NBadge } from 'najm-kit';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';
import { useTranslation } from 'najm-i18n/react';

const formatDate = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
};

export const useAnnouncementsTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: 'title',
      header: t('announcements.table.title'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-medium text-sm">{getValue()}</div>
      ),
    },
    {
      accessorKey: 'content',
      header: t('announcements.table.content'),
      enableSorting: false,
      cell: ({ getValue }) => {
        const content = getValue() as string;
        return (
          <div className="text-sm text-gray-700 truncate max-w-xs" title={content}>
            {content}
          </div>
        );
      },
    },
    {
      accessorKey: 'targetAudience',
      header: t('announcements.table.targetAudience'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const audience = getValue() as string;
        return <NBadge statusMap={STATUS_COLOR_MAP} status={audience} />;
      },
    },
    {
      accessorKey: 'author',
      header: t('announcements.table.author'),
      enableSorting: false,
      cell: ({ row }) => {
        const author = row.original.author;
        const name = author?.name || author?.email;
        return name ? (
          <div className="text-sm">{name}</div>
        ) : (
          <span className="text-gray-400">{t('common.notAssigned')}</span>
        );
      },
    },
    {
      accessorKey: 'class',
      header: t('announcements.table.class'),
      enableSorting: false,
      cell: ({ row }) => {
        const className = row.original.class?.name;
        const classCount = row.original.classIds?.length || 0;
        if (!className && !classCount) return <span className="text-gray-400">{t('common.notAssigned')}</span>;
        const label = className
          ? `${className}${classCount > 1 ? ` +${classCount - 1}` : ''}`
          : `${classCount} classes`;
        return <div className="font-medium">{label}</div>;
      },
    },
    {
      accessorKey: 'isPublished',
      header: t('announcements.table.isPublished'),
      enableSorting: true,
      filterFn: (row, columnId, filterValue) => String(row.getValue(columnId)) === String(filterValue),
      cell: ({ getValue }) => {
        const isPublished = getValue();
        const status = isPublished ? 'published' : 'draft';
        return <NBadge statusMap={STATUS_COLOR_MAP} status={status} />;
      },
      size: 120,
    },
    {
      accessorKey: 'publishDate',
      header: t('announcements.table.publishDate'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const date = formatDate(getValue());
        return date ? (
          <div className="text-sm">{date}</div>
        ) : (
          <span className="text-gray-400">—</span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: t('announcements.table.createdAt'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="text-sm text-muted-foreground">{formatDate(getValue())}</div>
      ),
    },
  ], [t]);
};
