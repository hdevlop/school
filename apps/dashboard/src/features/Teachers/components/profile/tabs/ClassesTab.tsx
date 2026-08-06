"use client";

import React, { useEffect, useState } from 'react';
import { Badge } from 'najm-kit';
import { NTable } from 'najm-kit';
import { getTeacherClassesApi } from '@/services/teacherApi';
import { BookOpen, GraduationCap, Users } from 'lucide-react';
import PageLoadingState from '@/shared/PageLoadingState';

interface ClassesTabProps {
  teacherId: string;
}

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
    <div className="text-[10px] font-semibold uppercase text-slate-500">{label}</div>
    <div className="mt-1 text-xl font-bold text-slate-800">{value}</div>
  </div>
);

const statusClass = (status?: string) => {
  if (status === 'active') return 'border-green-200 bg-green-50 text-green-700';
  if (status === 'completed') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status === 'cancelled') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
};

const ClassesTab: React.FC<ClassesTabProps> = ({ teacherId }) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const data: any = await getTeacherClassesApi(teacherId);
        setClasses(data?.data || []);
      } finally {
        setLoading(false);
      }
    };

    if (teacherId) fetchClasses();
  }, [teacherId]);

  const uniqueClasses = new Set(classes.map((item) => item.id || item.name).filter(Boolean));
  const totalStudents = classes.reduce((sum, item) => sum + Number(item.studentCount || 0), 0);
  const rows = classes.map((item, index) => ({
    ...item,
    id: item.id || `${item.name || 'class'}-${item.section?.id || index}`,
    className: item.name || '-',
    sectionName: item.section?.name || '-',
    subjectName: item.subject?.name || '-',
    studentCount: Number(item.studentCount || 0),
    status: item.status || 'active',
  }));
  const columns = [
    {
      accessorKey: 'className',
      header: 'Class',
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <GraduationCap className="h-4 w-4 text-primary" />
          {getValue() || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'sectionName',
      header: 'Section',
      enableSorting: true,
    },
    {
      accessorKey: 'subjectName',
      header: 'Subject',
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="flex items-center gap-2 text-slate-600">
          <BookOpen className="h-4 w-4 text-slate-400" />
          {getValue() || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'studentCount',
      header: 'Students',
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="flex items-center gap-2 text-slate-600">
          <Users className="h-4 w-4 text-slate-400" />
          {getValue() || 0}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      cell: ({ getValue }) => <Badge className={statusClass(getValue() as string)}>{getValue() || 'active'}</Badge>,
    },
  ];

  if (loading) {
    return (
      <PageLoadingState label="Loading classes" className="min-h-64" />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Classes" value={String(uniqueClasses.size)} />
        <StatCard label="Sections" value={String(classes.length)} />
        <StatCard label="Students" value={String(totalStudents)} />
      </div>

      <NTable
        data={rows}
        columns={columns}
        dynamicHeight={false}
        showPagination={false}
        showAddButton={false}
        showViewToggle={false}
        showColumnVisibility={false}
        noDataText="No classes assigned"
      />
    </div>
  );
};

export default ClassesTab;
