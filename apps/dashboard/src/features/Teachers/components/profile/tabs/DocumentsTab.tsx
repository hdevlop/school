"use client";

import React, { useMemo } from 'react';
import { NTable } from 'najm-kit';
import { Award, FileText } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';

interface DocumentsTabProps {
  teacher: any;
}

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-slate-500">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <div className="mt-1 text-xl font-bold text-slate-800">{value}</div>
  </div>
);

const DocumentsTab: React.FC<DocumentsTabProps> = () => {
  const { t } = useTranslation();
  const documents: any[] = [];
  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: t('teachers.profile.table.document'),
      enableSorting: true,
      cell: ({ getValue }) => <span className="font-medium text-slate-700">{getValue() as string}</span>,
    },
    {
      accessorKey: 'type',
      header: t('teachers.profile.table.type'),
      enableSorting: true,
    },
    {
      accessorKey: 'uploadDate',
      header: t('teachers.profile.table.uploaded'),
      enableSorting: true,
    },
  ], [t]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard icon={Award} label="Qualifications" value="0" />
        <StatCard icon={FileText} label="Certificates" value="0" />
        <StatCard icon={FileText} label="Other" value="0" />
      </div>

      <NTable
        data={documents}
        columns={columns}
        dynamicHeight={false}
        showPagination={false}
        showAddButton={false}
        showViewToggle={false}
        showColumnVisibility={false}
        noDataText="No documents uploaded"
      />
    </div>
  );
};

export default DocumentsTab;
