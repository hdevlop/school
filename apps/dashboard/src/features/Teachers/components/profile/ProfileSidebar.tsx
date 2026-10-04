"use client";

import React from 'react';
import { useTranslation } from 'najm-i18n/react';
import { Download, Save } from 'lucide-react';
import { NAvatar, NBadge, NButton } from 'najm-kit';
import { Label } from 'najm-kit';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

interface ProfileSidebarProps {
  teacher: any;
  draft?: Record<string, any>;
  analytics?: {
    totalClasses?: number;
    totalSubjects?: number;
    totalStudents?: number;
  };
  isDirty?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
}

const StatBox = ({ label, value }: { label: string; value: string }) => (
  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
    <p className="text-[10px] text-slate-500 uppercase font-semibold">{label}</p>
    <p className="text-sm font-bold mt-1 text-slate-700">{value}</p>
  </div>
);

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  teacher,
  draft,
  analytics,
  isDirty = false,
  isSaving = false,
  onSave,
}) => {
  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();
  const source = draft || teacher || {};
  const genderLabel = source?.gender === 'M' ? t('common.male') : source?.gender === 'F' ? t('common.female') : t('common.other');
  const hireYear = source?.hireDate ? new Date(source.hireDate).getFullYear() : '-';
  const status = source?.status || 'inactive';

  return (
    <div className="bg-white rounded-2xl h-full border border-slate-300 p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-24 opacity-10 bg-primary" />

      <div className="relative flex flex-col items-center text-center mt-4">
        <div className="relative mb-4">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border border-slate-100 bg-slate-50 p-1 shadow-sm">
            <NAvatar
              src={source?.image}
              fallback={source?.name}
              size="xl"
              version={teacher?.updatedAt}
            />
          </div>
          <div
            className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white ${
              status === 'active' ? 'bg-green-500' : 'bg-slate-400'
            }`}
          />
        </div>

        <Label className="text-xl font-bold text-slate-900">{source?.name ?? '-'}</Label>
        <p className="text-sm text-slate-500 mb-3">
          {source?.specialization || t('teachers.form.teacher')}
        </p>

        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          <NBadge className="rounded-full font-bold text-white bg-secondary">
            {t(`teachers.employmentType.${source?.employmentType}`)}
          </NBadge>
          <NBadge
            className={`rounded-full font-bold ${
              status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {t(`teachers.status.${status}`)}
          </NBadge>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full mb-6">
          <StatBox label={t('teachers.form.gender')} value={genderLabel} />
          <StatBox label={t('teachers.form.hireDate')} value={String(hireYear)} />
          <StatBox label={t('teachers.table.classes')} value={String(analytics?.totalClasses ?? 0)} />
          <StatBox label={t('teachers.table.subjects')} value={String(analytics?.totalSubjects ?? 0)} />
          <StatBox label={t('teachers.profile.table.students')} value={String(analytics?.totalStudents ?? 0)} />
          <StatBox label={t('teachers.form.workloadHours')} value={source?.workloadHours ? `${source.workloadHours}h` : '-'} />
          <StatBox label={t('teachers.form.salary')} value={majorMoney(source?.salary)} />
          <StatBox label={t('teachers.profile.experience')} value={source?.yearsOfExperience != null ? `${source.yearsOfExperience} ${t('teachers.profile.years')}` : '-'} />
        </div>

        <div className="flex flex-col gap-4 w-full">
          <NButton className="w-full bg-tertiary" disabled={!isDirty || isSaving} onClick={onSave}>
            <Save size={16} className="mr-2" />
            {isSaving ? t('common.saving') : t('common.save')}
          </NButton>
          <NButton variant="outline" className="w-full">
            <Download size={16} className="mr-2" />
            {t('students.profile.downloadReport')}
          </NButton>
        </div>
      </div>
    </div>
  );
};

export default ProfileSidebar;
