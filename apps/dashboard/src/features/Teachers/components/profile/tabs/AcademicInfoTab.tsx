"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { NIcon, NTable } from 'najm-kit';
import { Input } from 'najm-kit';
import { getTeacherClassesApi } from '@/services/teacherApi';
import { Award, BookOpen, Briefcase, Calendar, GraduationCap, Hash, ShieldCheck, Users } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';

interface AcademicInfoTabProps {
  teacher: any;
  teacherId: string;
  draft?: Record<string, any>;
  onDraftChange?: (field: string, value: any) => void;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-500">{children}</h3>
);

const EditableField = ({
  icon,
  label,
  value,
  iconColor,
  type = 'text',
  onChange,
}: {
  icon: any;
  label: string;
  value: string | number;
  iconColor?: string;
  type?: string;
  onChange: (value: string) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="flex items-center gap-2 text-sm font-medium leading-none text-foreground">
      <NIcon icon={icon} size={16} className="h-4 w-4" color={iconColor} />
      {label}
    </label>
    <Input value={value ?? ''} type={type} onChange={(event) => onChange(event.target.value)} className="h-9" />
  </div>
);

const formatText = (value?: string | null) => value ? value.replace(/[-_]/g, ' ') : '-';

const AcademicInfoTab: React.FC<AcademicInfoTabProps> = ({ teacher, teacherId, draft = {}, onDraftChange }) => {
  const { t } = useTranslation();
  const [classRows, setClassRows] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        const data: any = await getTeacherClassesApi(teacherId);
        setClassRows(data?.data || []);
      } finally {
        setLoadingClasses(false);
      }
    };

    if (teacherId) fetchClasses();
  }, [teacherId]);

  const update = (field: string) => (value: any) => onDraftChange?.(field, value);
  const tableRows = useMemo(
    () => {
      const assignments = Array.isArray(teacher?.assignments) ? teacher.assignments : [];
      return (classRows.length ? classRows : assignments).map((item: any, index: number) => ({
        ...item,
        id: item.id || `${item.classId || item.name || 'assignment'}-${item.section?.id || index}`,
        className: item.name || item.class?.name || item.classId || '-',
        sectionName: item.section?.name || item.sectionName || item.sectionIds?.join(', ') || '-',
        subjectName: item.subject?.name || item.subjectName || item.subjectIds?.join(', ') || '-',
        studentCount: Number(item.studentCount || 0),
      }));
    },
    [classRows, teacher?.assignments],
  );
  const uniqueClasses = useMemo(
    () => new Set(tableRows.map((item) => item.className).filter((value) => value && value !== '-')),
    [tableRows],
  );
  const uniqueSubjects = useMemo(
    () => new Set(tableRows.map((item) => item.subjectName).filter((value) => value && value !== '-')),
    [tableRows],
  );
  const totalStudents = tableRows.reduce((sum, item) => sum + Number(item.studentCount || 0), 0);
  const assignmentColumns = useMemo(() => [
    {
      accessorKey: 'className',
      header: t('teachers.profile.table.class'),
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <GraduationCap className="h-4 w-4 text-primary" />
          {row.original.className || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'sectionName',
      header: t('teachers.profile.table.section'),
      enableSorting: true,
      cell: ({ row }) => row.original.sectionName || '-',
    },
    {
      accessorKey: 'subjectName',
      header: t('teachers.profile.table.subject'),
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-slate-600">
          <BookOpen className="h-4 w-4 text-slate-400" />
          {row.original.subjectName || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'studentCount',
      header: t('teachers.profile.table.students'),
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-slate-600">
          <Users className="h-4 w-4 text-slate-400" />
          {row.original.studentCount || 0}
        </div>
      ),
    },
  ], [t]);

  return (
    <div className="space-y-7">
      <section>
        <SectionTitle>Academic Overview</SectionTitle>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
          <EditableField icon={GraduationCap} label="Specialization" value={draft.specialization} iconColor="#3b82f6" onChange={update('specialization')} />
          <EditableField icon={Award} label="Academic Degrees" value={draft.academicDegrees} iconColor="#8b5cf6" onChange={update('academicDegrees')} />
          <EditableField icon={Briefcase} label="Experience" value={draft.yearsOfExperience} type="number" iconColor="#f97316" onChange={update('yearsOfExperience')} />
          <EditableField icon={Calendar} label="Hire Date" value={draft.hireDate} type="date" iconColor="#f59e0b" onChange={update('hireDate')} />
          <EditableField icon={Hash} label="Workload Hours" value={draft.workloadHours} type="number" iconColor="#64748b" onChange={update('workloadHours')} />
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-sm font-medium leading-none text-foreground">
              <NIcon icon={ShieldCheck} size={16} className="h-4 w-4" color="#22c55e" />
              Status
            </label>
            <div className="flex min-h-9 w-full items-center rounded-md border border-input bg-slate-50 px-3 py-2 text-sm capitalize text-slate-800 shadow-sm">
              {formatText(draft.status)}
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Subjects And Classes</SectionTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-semibold uppercase text-slate-500">Classes</div>
              <div className="mt-1 text-xl font-bold text-slate-800">{uniqueClasses.size}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-semibold uppercase text-slate-500">Subjects</div>
              <div className="mt-1 text-xl font-bold text-slate-800">{uniqueSubjects.size}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-semibold uppercase text-slate-500">Sections</div>
              <div className="mt-1 text-xl font-bold text-slate-800">{tableRows.length}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-semibold uppercase text-slate-500">Students</div>
              <div className="mt-1 text-xl font-bold text-slate-800">{totalStudents}</div>
            </div>
          </div>

          <NTable
            data={tableRows}
            columns={assignmentColumns}
            loading={loadingClasses}
            dynamicHeight={false}
            showPagination={false}
            showAddButton={false}
            showViewToggle={false}
            showColumnVisibility={false}
            loadingText={t('teachers.profile.table.loadingAssignments')}
            noDataText="No assignments recorded"
          />
        </div>
      </section>

      {teacher?.bio && (
        <section>
          <SectionTitle>Biography</SectionTitle>
          <div className="rounded-md border border-input bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <div className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 text-slate-400" />
              <p>{teacher.bio}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default AcademicInfoTab;
