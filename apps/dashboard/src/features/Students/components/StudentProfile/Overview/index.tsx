'use client';

import React from 'react';
import {
  BookOpen,
  Briefcase,
  Cake,
  Calendar,
  CheckCircle,
  Clock,
  Globe,
  HeartPulse,
  Hash,
  Heart,
  IdCard,
  Layers,
  Mail,
  MapPin,
  Phone,
  School,
  User,
  Users,
} from 'lucide-react';
import { Checkbox, ImageInput, Input, NCard, NIcon, Textarea } from 'najm-kit';
import { NativeProfileSelect } from '../NativeProfileSelect';
import { Parent, Student } from '../types';
import { useTranslation } from '@/hooks/useLanguage';
import { personAvatarBackgroundClass } from '@/lib/avatar';

type Translate = (key: string, params?: Record<string, unknown> | null) => string;

const optionValues = {
  genders: ['M', 'F', 'Other'],
  statuses: ['active', 'inactive', 'graduated', 'transferred'],
  relationships: ['father', 'mother', 'guardian', 'stepparent', 'grandparent', 'other'],
  maritalStatuses: ['single', 'married', 'divorced', 'widowed', 'separated'],
};

const translatedOptions = (values: string[], keyPrefix: string, t: Translate) =>
  values.map((value) => ({ value, label: t(`${keyPrefix}.${value}`) }));

const RELATIONSHIP_COLORS: Record<string, string> = {
  father: 'border-blue-200 bg-blue-50 text-blue-700',
  mother: 'border-pink-200 bg-pink-50 text-pink-700',
  guardian: 'border-violet-200 bg-violet-50 text-violet-700',
  stepparent: 'border-orange-200 bg-orange-50 text-orange-700',
  grandparent: 'border-amber-200 bg-amber-50 text-amber-700',
  other: 'border-slate-200 bg-slate-50 text-slate-600',
};

const defaultParentImage = (gender?: string | null) =>
  gender === 'F' ? '/images/parent_female.png' : '/images/parent_male.png';

const genderLabel = (gender: string | null | undefined, t: Translate) =>
  gender ? t(`students.profile.genders.${gender}`) : '—';

const statusLabel = (status: string | null | undefined, t: Translate) =>
  status ? t(`students.status.${status}`) : '—';

const formatDate = (value: string | null | undefined, language: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(language, { year: 'numeric', month: 'short', day: 'numeric' });
};

const SectionTitle = ({ title }: { title: string }) => (
  <div className="mb-2 flex items-center gap-2">
    <span className="h-3.5 w-1 rounded-full bg-primary/70" />
    <h3 className="shrink-0 text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h3>
  </div>
);

const InfoCard = ({ children }: { children: React.ReactNode }) => (
  <NCard className="w-full p-3 transition-shadow hover:shadow-md">
    {children}
  </NCard>
);

const StudentFact = ({
  icon: Icon,
  label,
  value,
  tone = 'slate',
  muted = false,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  tone?: 'blue' | 'violet' | 'pink' | 'amber' | 'teal' | 'emerald' | 'rose' | 'slate';
  muted?: boolean;
}) => {
  const tones = {
    blue: 'bg-blue-50 text-blue-500',
    violet: 'bg-violet-50 text-violet-500',
    pink: 'bg-pink-50 text-pink-500',
    amber: 'bg-amber-50 text-amber-500',
    teal: 'bg-teal-50 text-teal-500',
    emerald: 'bg-emerald-50 text-emerald-500',
    rose: 'bg-rose-50 text-rose-500',
    slate: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-2">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        <div className={`truncate text-sm font-bold ${muted ? 'italic text-slate-400' : 'text-slate-800'}`}>
          {value || '—'}
        </div>
      </div>
    </div>
  );
};

const ParentDetail = ({
  icon: Icon,
  value,
  tone = 'slate',
}: {
  icon: any;
  value: React.ReactNode;
  tone?: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'violet';
}) => {
  const tones = {
    blue: 'text-blue-500',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
    slate: 'text-slate-400',
    violet: 'text-violet-500',
  };

  return (
    <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-slate-600">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${tones[tone]}`} />
      <span className="truncate">{value || '—'}</span>
    </div>
  );
};

const ParentSummaryCard = ({ parent }: { parent: Parent }) => {
  const { t } = useTranslation();
  const relationshipLabel = t(`students.profile.relationships.${parent.relationshipType}`);
  const relationshipColor = RELATIONSHIP_COLORS[parent.relationshipType] ?? RELATIONSHIP_COLORS.other;
  const maritalLabel = parent.maritalStatus
    ? t(`students.profile.maritalStatuses.${parent.maritalStatus}`)
    : null;

  return (
    <NCard className="overflow-hidden p-0">
      <div className="flex min-w-0 items-start gap-4 p-4">
        <img
          src={parent.image || defaultParentImage(parent.gender)}
          alt={t('students.profile.parentAvatarNamed', { name: parent.name })}
          className={`h-16 w-16 shrink-0 rounded-lg object-cover ${personAvatarBackgroundClass}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h4 className="truncate text-base font-bold text-slate-900">{parent.name}</h4>
            <span className={`rounded-full border px-2.5 py-0.5 text-sm font-bold ${relationshipColor}`}>
              {relationshipLabel}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {parent.age
              ? t('students.profile.yearsOld', { count: parent.age })
              : t('students.profile.ageNotRecorded')}
            {maritalLabel ? ` · ${maritalLabel}` : ''}
          </p>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ParentDetail icon={Mail} value={parent.email || t('students.profile.noEmailRecorded')} tone="blue" />
            <ParentDetail icon={Phone} value={parent.phone || t('students.profile.noPhoneRecorded')} tone="emerald" />
            <ParentDetail icon={Hash} value={parent.cin || t('students.profile.noCinRecorded')} />
            <ParentDetail icon={Briefcase} value={parent.occupation || t('students.profile.noOccupationRecorded')} tone="amber" />
          </div>
        </div>
      </div>

      <div className="flex min-h-12 flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
        {parent.isEmergencyContact ? (
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-sm font-bold text-rose-700">
            {t('students.profile.emergencyContact')}
          </span>
        ) : null}
        {parent.financialResponsibility ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700">
            {t('students.profile.financialResponsibility')}
          </span>
        ) : null}
        {!parent.isEmergencyContact && !parent.financialResponsibility ? (
          <span className="text-sm font-medium text-slate-400">{t('students.profile.noResponsibilities')}</span>
        ) : null}
      </div>
    </NCard>
  );
};

const ParentsOverviewSkeleton = () => (
  <InfoCard>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-slate-200 p-3">
          <div className="flex animate-pulse gap-3">
            <div className="h-12 w-12 rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted/70" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((__, detailIndex) => (
              <div key={detailIndex} className="h-3 rounded bg-muted/70" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </InfoCard>
);

const ParentsOverview = ({
  parents = [],
  isParentsLoading,
}: {
  parents?: Parent[];
  isParentsLoading?: boolean;
}) => {
  const { t } = useTranslation();
  if (isParentsLoading) return <ParentsOverviewSkeleton />;

  if (!parents.length) {
    return (
      <InfoCard>
        <div className="flex items-center gap-3 py-1 text-slate-500">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-600">{t('students.profile.noParentsLinked')}</p>
            <p className="text-sm text-slate-400">{t('students.profile.noParentsLinkedHelp')}</p>
          </div>
        </div>
      </InfoCard>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {parents.map((parent) => (
        <ParentSummaryCard key={parent.id} parent={parent} />
      ))}
    </div>
  );
};

const FieldSkeleton = () => (
  <div className="flex flex-col gap-1.5">
    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
    <div className="h-9 w-full animate-pulse rounded-md bg-muted/60" />
  </div>
);

const SkeletonSection = ({ count, cols = 'grid-cols-3' }: { count: number; cols?: string }) => (
  <div className="flex flex-col">
    <div className="mb-3 h-4 w-36 animate-pulse rounded bg-muted" />
    <div className={`grid ${cols} gap-x-4 gap-y-3`}>
      {Array.from({ length: count }).map((_, i) => <FieldSkeleton key={i} />)}
    </div>
  </div>
);

const EditableField = ({
  icon, label, value, iconColor, type = 'text', disabled = false, placeholder, autoComplete, onChange,
}: {
  icon: any;
  label: string;
  value: string | null | undefined;
  iconColor?: string;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
  autoComplete?: string;
  onChange: (value: string) => void;
}) => (
  <div className="flex w-full flex-col gap-1.5">
    <label className="flex items-center gap-2 text-sm font-medium leading-none text-foreground">
      <NIcon icon={icon} size={16} className="h-4 w-4" color={iconColor} />
      {label}
    </label>
    <Input
      value={value ?? ''}
      type={type}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete={autoComplete}
      onChange={(event) => onChange(event.target.value)}
      className="h-9"
    />
  </div>
);

const EditableSelect = ({
  icon, label, value, iconColor, options, onChange, disabled = false,
}: {
  icon: any;
  label: string;
  value: string | null | undefined;
  iconColor?: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) => {
  const { t } = useTranslation();

  return (
  <div className="flex w-full flex-col gap-1.5">
    <label className="flex items-center gap-2 text-sm font-medium leading-none text-foreground">
      <NIcon icon={icon} size={16} className="h-4 w-4" color={iconColor} />
      {label}
    </label>
    <NativeProfileSelect
      value={value ?? ''}
      onValueChange={onChange}
      disabled={disabled}
      options={options}
      placeholder={t('students.profile.selectField', { field: label.toLowerCase() })}
    />
  </div>
  );
};

const EditableTextArea = ({
  icon, label, value, iconColor, placeholder, onChange,
}: {
  icon: any;
  label: string;
  value: string | null | undefined;
  iconColor?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) => (
  <div className="flex w-full flex-col gap-1.5 md:col-span-3">
    <label className="flex items-center gap-2 text-sm font-medium leading-none text-foreground">
      <NIcon icon={icon} size={16} className="h-4 w-4" color={iconColor} />
      {label}
    </label>
    <Textarea
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-[72px]"
    />
  </div>
);

const EditableParentCard = ({
  parent,
  draft,
  onChange,
}: {
  parent: Parent;
  draft: Record<string, any>;
  onChange: (field: string, value: any) => void;
}) => {
  const { t } = useTranslation();
  const relationshipLabel = t(`students.profile.relationships.${draft.relationshipType}`);
  const relationshipColor = RELATIONSHIP_COLORS[draft.relationshipType] ?? RELATIONSHIP_COLORS.other;
  const genderOptions = translatedOptions(optionValues.genders, 'students.profile.genders', t);
  const relationshipOptions = translatedOptions(optionValues.relationships, 'students.profile.relationships', t);
  const maritalOptions = translatedOptions(optionValues.maritalStatuses, 'students.profile.maritalStatuses', t);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex min-w-0 gap-3">
        <div className="shrink-0">
          <ImageInput
            value={draft.image}
            onChange={(value) => onChange('image', value)}
            showPreview
            previewPosition="top"
            previewClassName="h-14 w-14 rounded-lg !border-solid !border-slate-200 bg-slate-100 shadow-sm"
            allowClear
            defaultImage={defaultParentImage(draft.gender)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-sm font-bold ${relationshipColor}`}>
              {relationshipLabel}
            </span>
            <span className="text-sm font-medium text-slate-400">
              {parent.age
                ? t('students.profile.yearsOld', { count: parent.age })
                : t('students.profile.ageFromBirthDate')}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <EditableField icon={User} label={t('students.profile.firstName')} value={draft.firstName} iconColor="#3b82f6" onChange={(value) => onChange('firstName', value)} />
            <EditableField icon={User} label={t('students.profile.lastName')} value={draft.lastName} iconColor="#3b82f6" onChange={(value) => onChange('lastName', value)} />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <EditableSelect icon={Users} label={t('students.profile.relationship')} value={draft.relationshipType} options={relationshipOptions} iconColor="#8b5cf6" onChange={(value) => onChange('relationshipType', value)} />
        <EditableField icon={Phone} label={t('students.form.phone')} value={draft.phone} iconColor="#22c55e" onChange={(value) => onChange('phone', value)} />
        <EditableField icon={Mail} label={t('students.form.email')} value={draft.email} iconColor="#3b82f6" onChange={(value) => onChange('email', value)} />
        <EditableField icon={Hash} label={t('students.profile.cinId')} value={draft.cin} iconColor="#94a3b8" onChange={(value) => onChange('cin', value)} />
        <EditableField icon={Briefcase} label={t('students.profile.occupation')} value={draft.occupation} iconColor="#f59e0b" onChange={(value) => onChange('occupation', value)} />
        <EditableField icon={Globe} label={t('students.profile.nationality')} value={draft.nationality} iconColor="#14b8a6" onChange={(value) => onChange('nationality', value)} />
        <EditableField icon={Cake} label={t('students.form.dateOfBirth')} value={draft.dateOfBirth} type="date" iconColor="#8b5cf6" onChange={(value) => onChange('dateOfBirth', value)} />
        <EditableSelect icon={Heart} label={t('students.profile.maritalStatus')} value={draft.maritalStatus} options={maritalOptions} iconColor="#ec4899" onChange={(value) => onChange('maritalStatus', value)} />
        <EditableSelect icon={Users} label={t('students.form.gender')} value={draft.gender} options={genderOptions} iconColor="#3b82f6" onChange={(value) => onChange('gender', value)} />
        <EditableTextArea icon={MapPin} label={t('students.form.address')} value={draft.address} iconColor="#ef4444" onChange={(value) => onChange('address', value)} />
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 md:col-span-1">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Checkbox checked={Boolean(draft.isEmergencyContact)} onCheckedChange={(value) => onChange('isEmergencyContact', Boolean(value))} />
            {t('students.profile.emergency')}
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Checkbox checked={Boolean(draft.financialResponsibility)} onCheckedChange={(value) => onChange('financialResponsibility', Boolean(value))} />
            {t('students.profile.financial')}
          </label>
        </div>
      </div>
    </div>
  );
};

const EditableParentsOverview = ({
  parents = [],
  isParentsLoading,
  parentDrafts = {},
  onParentDraftChange,
}: {
  parents?: Parent[];
  isParentsLoading?: boolean;
  parentDrafts?: Record<string, any>;
  onParentDraftChange?: (parentId: string, field: string, value: any) => void;
}) => {
  const { t } = useTranslation();
  if (isParentsLoading) return <ParentsOverviewSkeleton />;

  if (!parents.length) {
    return (
      <InfoCard>
        <div className="flex items-center gap-3 py-1 text-slate-500">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
            <Users className="h-4 w-4" />
          </div>
          <p className="text-sm font-semibold text-slate-600">{t('students.profile.noParentsLinked')}</p>
        </div>
      </InfoCard>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
      {parents.map((parent) => (
        <EditableParentCard
          key={parent.id}
          parent={parent}
          draft={parentDrafts[parent.id] || parent}
          onChange={(field, value) => onParentDraftChange?.(parent.id, field, value)}
        />
      ))}
    </div>
  );
};

interface OverviewTabProps {
  student?: Student | null;
  isLoading?: boolean;
  studentId?: string;
  draft?: Record<string, any>;
  classes?: any[];
  isEditing?: boolean;
  onDraftChange?: (field: string, value: any) => void;
  parents?: Parent[];
  isParentsLoading?: boolean;
  parentDrafts?: Record<string, any>;
  onParentDraftChange?: (parentId: string, field: string, value: any) => void;
}

function ReadOnlyOverview({
  student,
  parents,
  isParentsLoading,
}: {
  student: Student;
  parents?: Parent[];
  isParentsLoading?: boolean;
}) {
  const { t, language } = useTranslation();

  return (
    <div className="space-y-3">
      <section>
        <SectionTitle title={t('students.form.studentInformation')} />
        <InfoCard>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <StudentFact icon={User} label={t('students.form.fullName')} value={student.name} tone="blue" />
            <StudentFact icon={IdCard} label={t('students.form.studentCode')} value={student.studentCode} tone="violet" />
            <StudentFact
              icon={Calendar}
              label={t('students.form.dateOfBirth')}
              value={
                <>
                  {formatDate(student.dateOfBirth, language)}
                  {student.age ? <span className="ml-2 text-sm font-medium text-slate-400">({t('students.profile.yearsShort', { count: student.age })})</span> : null}
                </>
              }
              tone="pink"
            />
            <StudentFact icon={Users} label={t('students.form.gender')} value={genderLabel(student.gender, t)} tone="teal" />
            <StudentFact
              icon={CheckCircle}
              label={t('students.profile.attendanceDetails.status')}
              value={<span className="text-emerald-600">{statusLabel(student.status, t)}</span>}
              tone="emerald"
            />
            <StudentFact icon={BookOpen} label={t('students.form.class')} value={student.class?.name} tone="blue" />
            <StudentFact icon={Layers} label={t('students.form.section')} value={student.section?.name} tone="violet" />
            <StudentFact icon={Clock} label={t('students.form.enrollmentDate')} value={formatDate(student.enrollmentDate, language)} tone="amber" />
            <StudentFact icon={Mail} label={t('students.form.email')} value={student.email} tone="blue" />
            <StudentFact icon={Phone} label={t('students.form.phone')} value={student.phone || t('students.profile.noPhoneRecorded')} tone="emerald" muted={!student.phone} />
            <StudentFact icon={MapPin} label={t('students.form.address')} value={student.address || t('students.profile.noAddressRecorded')} tone="rose" muted={!student.address} />
            <StudentFact
              icon={School}
              label={t('students.form.previousSchool')}
              value={student.previousSchool || t('students.profile.noPreviousSchoolRecorded')}
              muted={!student.previousSchool}
            />
            <StudentFact
              icon={HeartPulse}
              label={t('students.profile.medical')}
              value={student.medicalConditions || t('students.profile.noMedicalConditionsRecorded')}
              tone="rose"
              muted={!student.medicalConditions}
            />
          </div>
        </InfoCard>
      </section>

      <section>
        <SectionTitle title={t('students.profile.familyContacts')} />
        <ParentsOverview parents={parents} isParentsLoading={isParentsLoading} />
      </section>
    </div>
  );
}

function EditableOverview({
  student,
  draft,
  classes,
  onDraftChange,
  parents,
  isParentsLoading,
  parentDrafts,
  onParentDraftChange,
}: {
  student: Student;
  draft: Record<string, any>;
  classes: any[];
  onDraftChange?: (field: string, value: any) => void;
  parents?: Parent[];
  isParentsLoading?: boolean;
  parentDrafts?: Record<string, any>;
  onParentDraftChange?: (parentId: string, field: string, value: any) => void;
}) {
  const { t } = useTranslation();
  const update = (field: string) => (value: any) => onDraftChange?.(field, value);
  const classOptions = classes.map((item) => ({ value: item.id, label: item.name }));
  const selectedClass = classes.find((item) => item.id === draft.classId);
  const sectionOptions = selectedClass?.sections?.map((section) => ({ value: section.id, label: section.name })) ?? [];
  const genderOptions = translatedOptions(optionValues.genders, 'students.profile.genders', t);
  const statusOptions = translatedOptions(optionValues.statuses, 'students.status', t);

  return (
    <div className="space-y-4">
      <section>
        <SectionTitle title={t('students.form.studentInformation')} />
        <InfoCard>
          <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 md:grid-cols-3">
            <EditableField icon={User} label={t('students.form.fullName')} value={draft.name} iconColor="#3b82f6" onChange={update('name')} />
            <EditableField icon={IdCard} label={t('students.form.studentCode')} value={draft.studentCode} iconColor="#8b5cf6" onChange={update('studentCode')} />
            <EditableField icon={Calendar} label={t('students.form.dateOfBirth')} value={draft.dateOfBirth} type="date" iconColor="#ec4899" onChange={update('dateOfBirth')} />
            <EditableField icon={Cake} label={t('students.profile.age')} value={student.age ? t('students.profile.yearsLong', { count: student.age }) : ''} disabled iconColor="#f59e0b" onChange={() => {}} />
            <EditableSelect icon={Users} label={t('students.form.gender')} value={draft.gender} options={genderOptions} iconColor="#14b8a6" onChange={update('gender')} />
            <EditableSelect icon={CheckCircle} label={t('students.profile.attendanceDetails.status')} value={draft.status} options={statusOptions} iconColor="#22c55e" onChange={update('status')} />
            <EditableSelect icon={BookOpen} label={t('students.form.class')} value={draft.classId} options={classOptions} iconColor="#3b82f6" onChange={update('classId')} />
            <EditableSelect icon={Layers} label={t('students.form.section')} value={draft.sectionId} options={sectionOptions} disabled={!draft.classId || sectionOptions.length === 0} iconColor="#8b5cf6" onChange={update('sectionId')} />
            <EditableField icon={Clock} label={t('students.form.enrollmentDate')} value={draft.enrollmentDate} type="date" iconColor="#f59e0b" onChange={update('enrollmentDate')} />
            <EditableField icon={School} label={t('students.form.previousSchool')} value={draft.previousSchool} placeholder={t('students.form.previousSchoolPlaceholder')} iconColor="#64748b" onChange={update('previousSchool')} />
            <EditableField icon={Mail} label={t('students.form.email')} value={draft.email} iconColor="#3b82f6" onChange={update('email')} />
            <EditableField icon={Phone} label={t('students.form.phone')} value={draft.phone} iconColor="#22c55e" onChange={update('phone')} />
            <EditableField icon={MapPin} label={t('students.form.address')} value={draft.address} iconColor="#ef4444" onChange={update('address')} />
            <EditableTextArea icon={HeartPulse} label={t('students.form.medicalConditions')} value={draft.medicalConditions} placeholder={t('students.profile.noMedicalConditionsRecorded')} iconColor="#ef4444" onChange={update('medicalConditions')} />
          </div>
        </InfoCard>
      </section>

      <section>
        <SectionTitle title={t('students.profile.familyContacts')} />
        <EditableParentsOverview
          parents={parents}
          isParentsLoading={isParentsLoading}
          parentDrafts={parentDrafts}
          onParentDraftChange={onParentDraftChange}
        />
      </section>
    </div>
  );
}

export default function OverviewTab({
  student,
  isLoading,
  draft = {},
  classes = [],
  isEditing = false,
  onDraftChange,
  parents = [],
  isParentsLoading,
  parentDrafts = {},
  onParentDraftChange,
}: OverviewTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonSection count={6} cols="grid-cols-3" />
        <SkeletonSection count={4} cols="grid-cols-3" />
        <SkeletonSection count={3} cols="grid-cols-3" />
        <SkeletonSection count={2} cols="grid-cols-2" />
      </div>
    );
  }

  if (!student) return null;

  if (isEditing) {
    return (
      <EditableOverview
        student={student}
        draft={draft}
        classes={classes}
        onDraftChange={onDraftChange}
        parents={parents}
        isParentsLoading={isParentsLoading}
        parentDrafts={parentDrafts}
        onParentDraftChange={onParentDraftChange}
      />
    );
  }

  return <ReadOnlyOverview student={student} parents={parents} isParentsLoading={isParentsLoading} />;
}
