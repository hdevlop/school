'use client';

import { NButton, NCard, NIcon } from 'najm-kit';

import React from 'react';
import {
  User, Mail, Phone, MapPin, Briefcase,
  Users, Hash,
  Globe, Heart, Cake, Save,
} from 'lucide-react';
import { Input } from 'najm-kit';
import { Textarea } from 'najm-kit';
import { Checkbox } from 'najm-kit';
import { ImageInput } from 'najm-kit';
import { NativeProfileSelect } from '../NativeProfileSelect';
import { useTranslation } from '@/hooks/useLanguage';
import { personAvatarBackgroundClass } from '@/lib/avatar';

// ─── types ───────────────────────────────────────────────────────────────────

interface Parent {
  id: string;
  name: string;
  email: string;
  cin: string | null;
  phone: string | null;
  gender: 'M' | 'F' | 'Other';
  address: string | null;
  dateOfBirth: string | null;
  age: number | null;
  occupation: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  relationshipType: string;
  isEmergencyContact: boolean;
  financialResponsibility: boolean;
  image: string | null;
}

interface ParentsTabProps {
  parents?: Parent[];
  isParentsLoading?: boolean;
  studentId?: string;
  student?: any;
  isLoading?: boolean;
  isEditing?: boolean;
  parentDrafts?: Record<string, any>;
  onParentDraftChange?: (parentId: string, field: string, value: any) => void;
  onParentsSave?: () => void | Promise<void>;
  isParentSaving?: boolean;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const RELATIONSHIP_COLORS: Record<string, string> = {
  father: 'bg-blue-50 text-blue-700 border-blue-200',
  mother: 'bg-pink-50 text-pink-700 border-pink-200',
  guardian: 'bg-purple-50 text-purple-700 border-purple-200',
  stepparent: 'bg-orange-50 text-orange-700 border-orange-200',
  grandparent: 'bg-amber-50 text-amber-700 border-amber-200',
  other: 'bg-slate-50 text-slate-600 border-slate-200',
};

const optionValues = {
  genders: ['M', 'F', 'Other'],
  relationships: ['father', 'mother', 'guardian', 'stepparent', 'grandparent', 'other'],
  maritalStatuses: ['single', 'married', 'divorced', 'widowed', 'separated'],
};

const defaultParentImage = (gender?: string) =>
  gender === 'F' ? '/images/parent_female.png' : '/images/parent_male.png';

// ─── sub-components ───────────────────────────────────────────────────────────

const EditableField = ({
  icon, label, value, iconColor, type = 'text', placeholder, autoComplete, onChange,
}: {
  icon: any;
  label: string;
  value: string | null | undefined;
  iconColor?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  onChange: (value: string) => void;
}) => {
  return (
    <div className="flex flex-col w-full gap-1.5">
      <label className="text-foreground flex items-center gap-2 text-sm font-medium leading-none">
        <NIcon icon={icon} size={16} className="w-4 h-4" color={iconColor} />
        {label}
      </label>
      <Input
        value={value ?? ''}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full"
      />
    </div>
  );
};

const EditableSelect = ({
  icon, label, value, iconColor, options, onChange,
}: {
  icon: any;
  label: string;
  value: string | null | undefined;
  iconColor?: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) => {
  const { t } = useTranslation();

  return (
  <div className="flex flex-col w-full gap-1.5">
    <label className="text-foreground flex items-center gap-2 text-sm font-medium leading-none">
      <NIcon icon={icon} size={16} className="w-4 h-4" color={iconColor} />
      {label}
    </label>
    <NativeProfileSelect
      value={value ?? ''}
      onValueChange={onChange}
      options={options}
      placeholder={t('students.profile.selectField', { field: label.toLowerCase() })}
    />
  </div>
  );
};

const EditableTextArea = ({
  icon, label, value, iconColor, onChange,
}: {
  icon: any;
  label: string;
  value: string | null | undefined;
  iconColor?: string;
  onChange: (value: string) => void;
}) => (
  <div className="flex flex-col w-full gap-1.5 md:col-span-2">
    <label className="text-foreground flex items-center gap-2 text-sm font-medium leading-none">
      <NIcon icon={icon} size={16} className="w-4 h-4" color={iconColor} />
      {label}
    </label>
    <Textarea value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="min-h-[72px]" />
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-muted-foreground font-semibold uppercase tracking-widest mb-3">{children}</p>
);

const Divider = () => <div className="border-t border-border" />;

// ─── parent card ─────────────────────────────────────────────────────────────

const ParentCard = ({
  parent,
  draft,
  onChange,
}: {
  parent: Parent;
  draft: any;
  onChange: (field: string, value: any) => void;
}) => {
  const { t } = useTranslation();
  const relationshipLabel = t(`students.profile.relationships.${draft.relationshipType}`);
  const relationshipColor = RELATIONSHIP_COLORS[draft.relationshipType] ?? RELATIONSHIP_COLORS.other;
  const maritalLabel = draft.maritalStatus ? t(`students.profile.maritalStatuses.${draft.maritalStatus}`) : null;
  const genderOptions = optionValues.genders.map((value) => ({ value, label: t(`students.profile.genders.${value}`) }));
  const relationshipOptions = optionValues.relationships.map((value) => ({ value, label: t(`students.profile.relationships.${value}`) }));
  const maritalOptions = optionValues.maritalStatuses.map((value) => ({ value, label: t(`students.profile.maritalStatuses.${value}`) }));

  return (
    <div className="border border-slate-200 rounded-xl bg-white flex flex-col overflow-hidden">

      <div className="flex items-start gap-4 p-5">
        <div className="relative shrink-0 pt-1">
          <ImageInput
            value={draft.image}
            onChange={(value) => onChange('image', value)}
            showPreview
            previewPosition="top"
            previewClassName="w-20 h-20 rounded-xl !border-solid !border-slate-200 bg-slate-100 shadow-sm"
            allowClear
            defaultImage={defaultParentImage(draft.gender)}
          />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <EditableField
              icon={User}
              label={t('students.profile.firstName')}
              value={draft.firstName}
              placeholder={t('students.profile.firstName')}
              iconColor="#3b82f6"
              onChange={(value) => onChange('firstName', value)}
            />
            <EditableField
              icon={User}
              label={t('students.profile.lastName')}
              value={draft.lastName}
              placeholder={t('students.profile.lastName')}
              iconColor="#3b82f6"
              onChange={(value) => onChange('lastName', value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-slate-400 mr-1">{parent.age ? t('students.profile.yearsOld', { count: parent.age }) : t('students.profile.ageFromBirthDate')}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-sm font-bold border ${relationshipColor}`}>
              {relationshipLabel}
            </span>
            {maritalLabel && (
              <span className="px-2.5 py-0.5 rounded-full text-sm font-bold bg-slate-50 text-slate-500 border border-slate-200">
                {maritalLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      <Divider />

      {/* ── Body ── */}
      <div className="px-5 pb-4 space-y-4">

        {/* Personal */}
        <div>
          <SectionLabel>{t('students.profile.personal')}</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <EditableField icon={Hash} label={t('students.profile.cinId')} value={draft.cin} iconColor="#94a3b8" onChange={(value) => onChange('cin', value)} />
            <EditableField icon={Cake} label={t('students.form.dateOfBirth')} value={draft.dateOfBirth} type="date" iconColor="#8b5cf6" onChange={(value) => onChange('dateOfBirth', value)} />
            <EditableField icon={Globe} label={t('students.profile.nationality')} value={draft.nationality} iconColor="#14b8a6" onChange={(value) => onChange('nationality', value)} />
            <EditableSelect icon={Heart} label={t('students.profile.maritalStatus')} value={draft.maritalStatus} options={maritalOptions} iconColor="#ec4899" onChange={(value) => onChange('maritalStatus', value)} />
            <EditableSelect icon={Users} label={t('students.form.gender')} value={draft.gender} options={genderOptions} iconColor="#3b82f6" onChange={(value) => onChange('gender', value)} />
            <EditableSelect icon={Users} label={t('students.profile.relationship')} value={draft.relationshipType} options={relationshipOptions} iconColor="#8b5cf6" onChange={(value) => onChange('relationshipType', value)} />
          </div>
        </div>

        <Divider />

        {/* Contact */}
        <div>
          <SectionLabel>{t('students.profile.contact')}</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <EditableField icon={Mail} label={t('students.form.email')} value={draft.email} iconColor="#3b82f6" onChange={(value) => onChange('email', value)} />
            <EditableField icon={Phone} label={t('students.form.phone')} value={draft.phone} iconColor="#22c55e" onChange={(value) => onChange('phone', value)} />
            <EditableField icon={Briefcase} label={t('students.profile.occupation')} value={draft.occupation} iconColor="#f59e0b" onChange={(value) => onChange('occupation', value)} />
            <EditableTextArea icon={MapPin} label={t('students.form.address')} value={draft.address} iconColor="#ef4444" onChange={(value) => onChange('address', value)} />
          </div>
        </div>
      </div>

      <Divider />
      <div className="flex flex-wrap items-center gap-4 px-5 py-3 bg-slate-50/70">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Checkbox checked={Boolean(draft.isEmergencyContact)} onCheckedChange={(value) => onChange('isEmergencyContact', Boolean(value))} />
            {t('students.profile.emergencyContact')}
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Checkbox checked={Boolean(draft.financialResponsibility)} onCheckedChange={(value) => onChange('financialResponsibility', Boolean(value))} />
            {t('students.profile.financialResponsibility')}
          </label>
        </div>
      </div>
    </div>
  );
};

const ReadOnlyParentCard = ({ parent }: { parent: Parent }) => {
  const { t } = useTranslation();
  const relationshipLabel = t(`students.profile.relationships.${parent.relationshipType}`);
  const relationshipColor = RELATIONSHIP_COLORS[parent.relationshipType] ?? RELATIONSHIP_COLORS.other;
  const maritalLabel = parent.maritalStatus ? t(`students.profile.maritalStatuses.${parent.maritalStatus}`) : null;

  return (
    <NCard className="overflow-hidden p-0">
      <div className="flex items-start gap-4 p-4">
        <img
          src={parent.image || defaultParentImage(parent.gender)}
          alt={t('students.profile.parentAvatarNamed', { name: parent.name })}
          className={`h-16 w-16 shrink-0 rounded-lg object-cover ${personAvatarBackgroundClass}`}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-slate-900">{parent.name}</h3>
            <span className={`rounded-full border px-2.5 py-0.5 text-sm font-bold ${relationshipColor}`}>
              {relationshipLabel}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {parent.age ? t('students.profile.yearsOld', { count: parent.age }) : t('students.profile.ageNotRecorded')}
            {maritalLabel ? ` · ${maritalLabel}` : ''}
          </p>

          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <div className="flex min-w-0 items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-blue-500" />
              <span className="truncate">{parent.email || t('students.profile.noEmailRecorded')}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="truncate">{parent.phone || t('students.profile.noPhoneRecorded')}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Hash className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{parent.cin || t('students.profile.noCinRecorded')}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="truncate">{parent.occupation || t('students.profile.noOccupationRecorded')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
        {parent.isEmergencyContact && (
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-sm font-bold text-rose-700">
            {t('students.profile.emergencyContact')}
          </span>
        )}
        {parent.financialResponsibility && (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700">
            {t('students.profile.financialResponsibility')}
          </span>
        )}
        {!parent.isEmergencyContact && !parent.financialResponsibility && (
          <span className="text-sm font-medium text-slate-400">{t('students.profile.noResponsibilities')}</span>
        )}
      </div>
    </NCard>
  );
};

// ─── skeleton ─────────────────────────────────────────────────────────────────

const ParentCardSkeleton = () => (
  <div className="border border-slate-200 rounded-xl bg-white overflow-hidden animate-pulse">
    <div className="flex items-center gap-4 p-5 pb-4">
      <div className="w-20 h-20 rounded-xl bg-slate-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-36 bg-slate-200 rounded" />
        <div className="h-3 w-20 bg-slate-100 rounded" />
        <div className="flex gap-2 mt-1">
          <div className="h-5 w-16 bg-slate-100 rounded-full" />
          <div className="h-5 w-14 bg-slate-100 rounded-full" />
        </div>
      </div>
    </div>
    <div className="border-t border-slate-100" />
    <div className="grid grid-cols-2 gap-4 px-5 py-4">
      <div className="space-y-3">
        {[80, 64, 72, 56].map(w => (
          <div key={w} className="space-y-1">
            <div className="h-2.5 bg-slate-100 rounded" style={{ width: `${w}%` }} />
            <div className="h-3.5 bg-slate-200 rounded" style={{ width: `${w + 10}%` }} />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[70, 60, 75, 65].map(w => (
          <div key={w} className="space-y-1">
            <div className="h-2.5 bg-slate-100 rounded" style={{ width: `${w}%` }} />
            <div className="h-3.5 bg-slate-200 rounded" style={{ width: `${w + 10}%` }} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── main tab ─────────────────────────────────────────────────────────────────

export default function ParentsTab({
  parents = [],
  isParentsLoading,
  isEditing = false,
  parentDrafts = {},
  onParentDraftChange,
  onParentsSave,
  isParentSaving,
}: ParentsTabProps) {
  const { t } = useTranslation();

  if (isParentsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <ParentCardSkeleton />
        <ParentCardSkeleton />
      </div>
    );
  }

  if (!parents.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <div className="p-4 rounded-full bg-slate-100">
          <Users size={36} strokeWidth={1.5} />
        </div>
        <p className="font-semibold text-slate-500">{t('students.profile.noParentsLinked')}</p>
        <p className="text-sm text-slate-400">{t('students.profile.noParentsLinkedHelp')}</p>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {parents.map((parent) => (
          <ReadOnlyParentCard key={parent.id} parent={parent} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {parents.map((parent) => (
          <ParentCard
            key={parent.id}
            parent={parent}
            draft={parentDrafts[parent.id] || parent}
            onChange={(field, value) => onParentDraftChange?.(parent.id, field, value)}
          />
        ))}
      </div>

      <div className="sticky bottom-0 z-10 flex justify-end border-t border-slate-200 bg-white/95 px-1 py-3 backdrop-blur">
        <NButton type="button" size="sm" onClick={onParentsSave} disabled={isParentSaving}>
          <Save size={14} className="mr-2" />
          {isParentSaving ? t('students.profile.savingParents') : t('students.profile.saveParents')}
        </NButton>
      </div>
    </div>
  );
}
