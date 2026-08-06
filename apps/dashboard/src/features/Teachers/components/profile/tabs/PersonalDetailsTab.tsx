"use client";

import React from 'react';
import { NIcon } from 'najm-kit';
import { Input } from 'najm-kit';
import { Textarea } from 'najm-kit';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'najm-kit';
import {
  BadgeDollarSign,
  Banknote,
  Briefcase,
  Calendar,
  GraduationCap,
  Hash,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';

interface PersonalDetailsTabProps {
  teacher: any;
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
  autoComplete,
  onChange,
  className = '',
}: {
  icon: any;
  label: string;
  value: string | number;
  iconColor?: string;
  type?: string;
  autoComplete?: string;
  onChange: (value: string) => void;
  className?: string;
}) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="flex items-center gap-2 text-sm font-medium leading-none text-foreground">
      <NIcon icon={icon} size={16} className="h-4 w-4" color={iconColor} />
      {label}
    </label>
    <Input value={value ?? ''} type={type} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} className="h-9" />
  </div>
);

const EditableSelect = ({
  icon,
  label,
  value,
  iconColor,
  options,
  onChange,
}: {
  icon: any;
  label: string;
  value: string;
  iconColor?: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="flex items-center gap-2 text-sm font-medium leading-none text-foreground">
      <NIcon icon={icon} size={16} className="h-4 w-4" color={iconColor} />
      {label}
    </label>
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const EditableTextArea = ({
  icon,
  label,
  value,
  iconColor,
  onChange,
  className = '',
}: {
  icon: any;
  label: string;
  value: string;
  iconColor?: string;
  onChange: (value: string) => void;
  className?: string;
}) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="flex items-center gap-2 text-sm font-medium leading-none text-foreground">
      <NIcon icon={icon} size={16} className="h-4 w-4" color={iconColor} />
      {label}
    </label>
    <Textarea value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="min-h-[72px]" />
  </div>
);

const genderOptions = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'onLeave', label: 'On Leave' },
];

const employmentTypeOptions = [
  { value: 'fullTime', label: 'Full-time' },
  { value: 'partTime', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
];

const PersonalDetailsTab: React.FC<PersonalDetailsTabProps> = ({ teacher, draft = {}, onDraftChange }) => {
  if (!teacher) return null;

  const update = (field: string) => (value: any) => onDraftChange?.(field, value);

  return (
    <div className="space-y-7">
      <section>
        <SectionTitle>Personal Information</SectionTitle>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
          <EditableField icon={User} label="Full Name" value={draft.name} iconColor="#3b82f6" onChange={update('name')} />
          <EditableField icon={Hash} label="CIN / ID" value={draft.cin} iconColor="#94a3b8" onChange={update('cin')} />
          <EditableSelect icon={Users} label="Gender" value={draft.gender} options={genderOptions} iconColor="#0ea5e9" onChange={update('gender')} />
          <EditableField icon={Calendar} label="Hire Date" value={draft.hireDate} type="date" iconColor="#f59e0b" onChange={update('hireDate')} />
          <EditableSelect icon={ShieldCheck} label="Status" value={draft.status} options={statusOptions} iconColor="#22c55e" onChange={update('status')} />
          <EditableSelect icon={Briefcase} label="Employment Type" value={draft.employmentType} options={employmentTypeOptions} iconColor="#8b5cf6" onChange={update('employmentType')} />
        </div>
      </section>

      <section>
        <SectionTitle>Academic Information</SectionTitle>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
          <EditableField icon={GraduationCap} label="Specialization" value={draft.specialization} iconColor="#3b82f6" onChange={update('specialization')} />
          <EditableField icon={Briefcase} label="Experience" value={draft.yearsOfExperience} type="number" iconColor="#f97316" onChange={update('yearsOfExperience')} />
          <EditableField icon={Calendar} label="Workload Hours" value={draft.workloadHours} type="number" iconColor="#06b6d4" onChange={update('workloadHours')} />
          <EditableField icon={Banknote} label="Salary" value={draft.salary} type="number" iconColor="#22c55e" onChange={update('salary')} />
          <EditableField icon={BadgeDollarSign} label="Bank Account" value={draft.bankAccount} iconColor="#64748b" onChange={update('bankAccount')} className="md:col-span-2" />
        </div>
      </section>

      <section>
        <SectionTitle>Contact Information</SectionTitle>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
          <EditableField icon={Mail} label="Email" value={draft.email} iconColor="#3b82f6" onChange={update('email')} />
          <EditableField icon={Phone} label="Phone" value={draft.phone} iconColor="#22c55e" onChange={update('phone')} />
          <EditableField icon={Phone} label="Emergency Phone" value={draft.emergencyPhone} iconColor="#ef4444" onChange={update('emergencyPhone')} />
          <EditableField icon={Users} label="Emergency Contact" value={draft.emergencyContact} iconColor="#f59e0b" onChange={update('emergencyContact')} />
          <EditableTextArea icon={MapPin} label="Address" value={draft.address} iconColor="#ef4444" onChange={update('address')} className="md:col-span-2" />
        </div>
      </section>
    </div>
  );
};

export default PersonalDetailsTab;
