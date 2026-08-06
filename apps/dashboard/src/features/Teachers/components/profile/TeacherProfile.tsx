"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';
import ProfileSidebar from './ProfileSidebar';
import AcademicInfoTab from './tabs/AcademicInfoTab';
import PersonalDetailsTab from './tabs/PersonalDetailsTab';
import ScheduleTab from './tabs/ScheduleTab';
import DocumentsTab from './tabs/DocumentsTab';
import PaymentsTab from './tabs/PaymentsTab';
import { getTeacherByIdApi } from '@/services/teacherApi';
import { useTeachers } from '@/features/Teachers/hooks/useTeachers';
import { Label } from 'najm-kit';
import PageLoadingState from '@/shared/PageLoadingState';
import {
  GraduationCap,
  User,
  Calendar,
  FileText,
  CreditCard,
} from 'lucide-react';

interface TeacherProfileProps {
  teacherId: string;
}

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

const normalizeStatus = (value?: string | null) => {
  if (value === 'on_leave') return 'onLeave';
  return value || 'active';
};

const normalizeEmploymentType = (value?: string | null) => {
  if (value === 'full-time') return 'fullTime';
  if (value === 'part-time') return 'partTime';
  if (value === 'substitute') return 'temporary';
  return value || 'fullTime';
};

const createDraft = (teacher: any) => ({
  id: teacher?.id ?? '',
  image: teacher?.image ?? null,
  name: teacher?.name ?? '',
  cin: teacher?.cin ?? '',
  email: teacher?.email ?? '',
  phone: teacher?.phone ?? '',
  address: teacher?.address ?? '',
  gender: teacher?.gender ?? 'M',
  emergencyContact: teacher?.emergencyContact ?? '',
  emergencyPhone: teacher?.emergencyPhone ?? '',
  status: normalizeStatus(teacher?.status),
  specialization: teacher?.specialization ?? '',
  yearsOfExperience: teacher?.yearsOfExperience ?? 0,
  salary: teacher?.salary ?? 0,
  hireDate: toDateInput(teacher?.hireDate),
  bankAccount: teacher?.bankAccount ?? '',
  employmentType: normalizeEmploymentType(teacher?.employmentType),
  workloadHours: teacher?.workloadHours ?? 40,
  academicDegrees: teacher?.academicDegrees ?? '',
  assignments: teacher?.assignments ?? [],
});

const TeacherProfile: React.FC<TeacherProfileProps> = ({ teacherId }) => {
  const { t } = useTranslation();
  const [teacher, setTeacher] = useState<any>(null);
  const [draft, setDraft] = useState(() => createDraft(null));
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { updateTeacher, isUpdating } = useTeachers({ enabled: false });

  const fetchTeacherData = useCallback(async () => {
    if (!teacherId) return;
      try {
        setLoading(true);
        const teacherData: any = await getTeacherByIdApi(teacherId);
        setTeacher(teacherData?.data);
      } catch {
      } finally {
        setLoading(false);
      }
    }, [teacherId]);

  useEffect(() => {
    if (teacherId) {
      fetchTeacherData();
    }
  }, [teacherId, fetchTeacherData]);

  useEffect(() => {
    if (teacher) setDraft(createDraft(teacher));
  }, [teacher]);

  const isDirty = useMemo(() => {
    if (!teacher) return false;
    return JSON.stringify(draft) !== JSON.stringify(createDraft(teacher));
  }, [draft, teacher]);

  const handleDraftChange = (field: string, value: any) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (!teacher?.id) return;

    const payload: any = {
      ...draft,
      id: teacher.id,
      phone: draft.phone || null,
      emergencyContact: draft.emergencyContact || undefined,
      emergencyPhone: draft.emergencyPhone || undefined,
      specialization: draft.specialization || undefined,
      academicDegrees: draft.academicDegrees || undefined,
      bankAccount: draft.bankAccount || undefined,
      hireDate: draft.hireDate || null,
      yearsOfExperience: Number(draft.yearsOfExperience || 0),
      workloadHours: Number(draft.workloadHours || 0),
      salary: draft.salary === '' || draft.salary == null ? undefined : Number(draft.salary),
    };

    if (payload.image === teacher.image) delete payload.image;
    await updateTeacher(payload);
    await fetchTeacherData();
  };

  // Calculate analytics from teacher data
  const calculateAnalytics = () => {
    if (!teacher?.assignments) {
      return {
        totalClasses: 0,
        totalSubjects: 0,
        totalStudents: 0,
      };
    }

    const uniqueClasses = new Set(teacher.assignments.map((a: any) => a.classId));
    const uniqueSubjects = new Set(
      teacher.assignments.flatMap((a: any) => a.subjectIds || [])
    );

    return {
      totalClasses: uniqueClasses.size,
      totalSubjects: uniqueSubjects.size,
      totalStudents: 0, // This would come from API
    };
  };

  const analytics = calculateAnalytics();

  if (loading) {
    return (
      <PageLoadingState label={`${t('common.loading')}...`} className="min-h-80" />
    );
  }

  if (!teacher) {
    return (
      <div className="flex items-center justify-center py-20">
        <Label className="text-muted-foreground text-lg">
          {t('teachers.profile.teacherNotFound')}
        </Label>
      </div>
    );
  }

  const tabs = [
    { value: 'overview', icon: User, label: 'Overview' },
    { value: 'academic', icon: GraduationCap, label: 'Academic' },
    { value: 'schedule', icon: Calendar, label: 'Schedule' },
    { value: 'payments', icon: CreditCard, label: 'Payments' },
    { value: 'documents', icon: FileText, label: 'Documents' },
  ];

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-6 w-full">
      <div className="lg:col-span-1">
        <ProfileSidebar
          teacher={teacher}
          draft={draft}
          analytics={analytics}
          isDirty={isDirty}
          isSaving={isUpdating}
          onSave={handleSave}
        />
      </div>

      <div className="flex h-full lg:col-span-3 border border-slate-300 p-4 rounded-2xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="border-b border-slate-200 px-6 h-auto w-full flex gap-6 overflow-x-auto scrollbar-hide justify-start p-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="shadow-none! bg-transparent border-b-2 border-transparent! data-[state=active]:text-primary! data-[state=active]:border-b-primary! text-slate-500 hover:text-slate-700 flex items-center gap-2 pb-3 px-2 text-sm font-medium transition-all cursor-pointer relative"
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="overview" className="px-0 py-3">
              <PersonalDetailsTab
                teacher={teacher}
                draft={draft}
                onDraftChange={handleDraftChange}
              />
            </TabsContent>

            <TabsContent value="academic" className="px-0 py-3">
              <AcademicInfoTab
                teacher={teacher}
                teacherId={teacherId}
                draft={draft}
                onDraftChange={handleDraftChange}
              />
            </TabsContent>

            <TabsContent value="schedule" className="px-0 py-3">
              <ScheduleTab teacher={teacher} />
            </TabsContent>

            <TabsContent value="payments" className="px-0 py-3">
              <PaymentsTab teacher={teacher} />
            </TabsContent>

            <TabsContent value="documents" className="px-0 py-3">
              <DocumentsTab teacher={teacher} />
            </TabsContent>
          </Tabs>
      </div>
    </div>
  );
};

export default TeacherProfile;
