"use client";

import React from 'react';
import { Download, Save } from 'lucide-react';
import { NAvatar, NButton } from 'najm-kit';
import { getAvatarFallback, personAvatarClassNames } from '@/lib/avatar';
import { Label } from 'najm-kit';

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

const formatMoneyStat = (value: unknown) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return '0 DH';
  if (amount >= 1000) return `${Math.round(amount / 100) / 10}k DH`;
  return `${Math.round(amount)} DH`;
};

const formatEmployment = (value?: string | null) => {
  if (!value) return '-';
  const normalized = value.replace(/[-_]/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  teacher,
  draft,
  analytics,
  isDirty = false,
  isSaving = false,
  onSave,
}) => {
  const source = draft || teacher || {};
  const genderLabel = source?.gender === 'M' ? 'Male' : source?.gender === 'F' ? 'Female' : 'Other';
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
              fallback={getAvatarFallback(source?.name)}
              size="xl"
              classNames={personAvatarClassNames}
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
          {source?.specialization || 'Teacher'}
        </p>

        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          <Label className="px-3 py-1 rounded-full text-xs font-bold text-white bg-secondary">
            {formatEmployment(source?.employmentType)}
          </Label>
          <Label
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Label>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full mb-6">
          <StatBox label="Gender" value={genderLabel} />
          <StatBox label="Hired" value={String(hireYear)} />
          <StatBox label="Classes" value={String(analytics?.totalClasses ?? 0)} />
          <StatBox label="Subjects" value={String(analytics?.totalSubjects ?? 0)} />
          <StatBox label="Students" value={String(analytics?.totalStudents ?? 0)} />
          <StatBox label="Workload" value={source?.workloadHours ? `${source.workloadHours}h` : '-'} />
          <StatBox label="Salary" value={formatMoneyStat(source?.salary)} />
          <StatBox label="Experience" value={source?.yearsOfExperience != null ? `${source.yearsOfExperience} yrs` : '-'} />
        </div>

        <div className="flex flex-col gap-4 w-full">
          <NButton className="w-full bg-tertiary" disabled={!isDirty || isSaving} onClick={onSave}>
            <Save size={16} className="mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </NButton>
          <NButton variant="outline" className="w-full">
            <Download size={16} className="mr-2" />
            Download Report
          </NButton>
        </div>
      </div>
    </div>
  );
};

export default ProfileSidebar;
