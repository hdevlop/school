"use client";

import React, { useEffect, useState } from 'react';
import { NTable } from 'najm-kit';
import { getTeacherClassesApi } from '@/services/teacherApi';
import { BookOpen, GraduationCap } from 'lucide-react';
import PageLoadingState from '@/shared/PageLoadingState';
import { useTranslation } from '@/hooks/useLanguage';

interface SubjectsTabProps {
  teacher: any;
  teacherId: string;
}

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
    <div className="text-[10px] font-semibold uppercase text-slate-500">{label}</div>
    <div className="mt-1 text-xl font-bold text-slate-800">{value}</div>
  </div>
);

const SubjectsTab: React.FC<SubjectsTabProps> = ({ teacher, teacherId }) => {
  const { t } = useTranslation();
  const [assignmentRows, setAssignmentRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRows = async () => {
      try {
        setLoading(true);
        const data: any = await getTeacherClassesApi(teacherId);
        setAssignmentRows(data?.data || []);
      } finally {
        setLoading(false);
      }
    };

    if (teacherId) fetchRows();
  }, [teacherId]);

  const subjectMap = new Map<string, { id: string; name: string; code?: string; classes: string[] }>();

  assignmentRows.forEach((row: any) => {
    const subjectId = row.subject?.id || row.subjectId;
    if (!subjectId) return;
    const item = subjectMap.get(subjectId) || {
      id: subjectId,
      name: row.subject?.name || subjectId,
      code: row.subject?.code,
      classes: [],
    };
    const className = row.name || row.class?.name || row.classId;
    if (className && !item.classes.includes(className)) item.classes.push(className);
    subjectMap.set(subjectId, item);
  });

  const subjects = Array.from(subjectMap.values());
  const columns = [
    {
      accessorKey: 'name',
      header: t('teachers.profile.table.subject'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <BookOpen className="h-4 w-4 text-primary" />
          {getValue() || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'code',
      header: t('teachers.profile.table.code'),
      enableSorting: true,
      cell: ({ getValue }) => getValue() || <span className="text-slate-400">-</span>,
    },
    {
      accessorKey: 'classesText',
      header: t('teachers.profile.table.classes'),
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-slate-600">
          <GraduationCap className="h-4 w-4 text-slate-400" />
          {row.original.classes?.join(', ') || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'classCount',
      header: t('teachers.profile.table.classCount'),
      enableSorting: true,
      cell: ({ row }) => row.original.classes?.length || 0,
    },
  ];
  const subjectRows = subjects.map((subject) => ({
    ...subject,
    classesText: subject.classes.join(', '),
    classCount: subject.classes.length,
  }));

  if (loading) {
    return (
      <PageLoadingState label="Loading subjects" className="min-h-64" />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Subjects" value={String(subjects.length)} />
        <StatCard label="Assignments" value={String(assignmentRows.length)} />
        <StatCard label="Specialization" value={teacher?.specialization || '-'} />
      </div>

      <NTable
        data={subjectRows}
        columns={columns}
        dynamicHeight={false}
        showPagination={false}
        showAddButton={false}
        showViewToggle={false}
        showColumnVisibility={false}
        noDataText="No subjects assigned"
      />
    </div>
  );
};

export default SubjectsTab;
