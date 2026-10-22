"use client";

import React from 'react';
import Link from 'next/link';
import { HeartHandshake, Phone, UserRound, UsersRound } from 'lucide-react';
import { NAvatar, NBadge, NCard, NEmptyState } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { FamilyUnlinkButton } from '../FamilyLinkActions';
import {
  GENDER_TRANSLATION_PREFIX,
  MARITAL_STATUS_TRANSLATION_PREFIX,
  RELATIONSHIP_TYPE_TRANSLATION_PREFIX,
} from '../../config/parentOptions';

interface ParentDetailsTabProps {
  parent: any;
  // The children linked for the viewed year, as the overview reads them.
  linkedChildren: any[];
}

type Field = { label: string; value: React.ReactNode };

// The same label/value list as the teacher's Details tab.
const FieldList = ({ fields, empty }: { fields: Field[]; empty: string }) => (
  <dl className="flex flex-col divide-y divide-border/60">
    {fields.map(({ label, value }) => (
      <div key={label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-3 py-2.5 text-sm">
        <dt className="truncate text-muted-foreground">{label}</dt>
        <dd className="min-w-0 truncate text-foreground">
          {value === null || value === undefined || value === '' ? (
            <span className="text-muted-foreground">{empty}</span>
          ) : value}
        </dd>
      </div>
    ))}
  </dl>
);

/** Who the parent is and how to reach them, with the children linked to them. */
const ParentDetailsTab: React.FC<ParentDetailsTabProps> = ({ parent, linkedChildren }) => {
  const { t } = useTranslation();
  const { displayDateOnly } = useSchoolFormat();
  const empty = t('common.notSpecified');
  const yesNo = (value: unknown) =>
    t(`parents.profile.dashboard.details.${value ? 'yes' : 'no'}`);

  const personal: Field[] = [
    { label: t('parents.form.fullName'), value: parent?.name },
    { label: t('parents.form.cin'), value: parent?.cin },
    { label: t('parents.form.gender'), value: parent?.gender ? t(`${GENDER_TRANSLATION_PREFIX}.${parent.gender}`) : null },
    { label: t('parents.form.dateOfBirth'), value: parent?.dateOfBirth ? displayDateOnly(parent.dateOfBirth) : null },
    { label: t('parents.form.nationality'), value: parent?.nationality },
    {
      label: t('parents.form.maritalStatus'),
      value: parent?.maritalStatus ? t(`${MARITAL_STATUS_TRANSLATION_PREFIX}.${parent.maritalStatus}`) : null,
    },
  ];

  const contact: Field[] = [
    { label: t('parents.form.phone'), value: parent?.phone },
    { label: t('parents.form.email'), value: parent?.email },
    { label: t('parents.form.address'), value: parent?.address },
  ];

  const family: Field[] = [
    {
      label: t('parents.form.relationshipType'),
      value: parent?.relationshipType ? t(`${RELATIONSHIP_TYPE_TRANSLATION_PREFIX}.${parent.relationshipType}`) : null,
    },
    { label: t('parents.form.occupation'), value: parent?.occupation },
    { label: t('parents.form.financialResponsibility'), value: yesNo(parent?.financialResponsibility) },
    { label: t('parents.form.isEmergencyContact'), value: yesNo(parent?.isEmergencyContact) },
  ];

  return (
    <div className="flex min-h-full flex-col gap-3 pb-1">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <NCard title={t('parents.form.personalInformation')} icon={UserRound} className="h-full">
          <FieldList fields={personal} empty={empty} />
        </NCard>
        <NCard title={t('parents.form.contactInformation')} icon={Phone} className="h-full">
          <FieldList fields={contact} empty={empty} />
        </NCard>
        <NCard title={t('parents.profile.dashboard.details.familyRole')} icon={HeartHandshake} className="h-full">
          <FieldList fields={family} empty={empty} />
        </NCard>
      </div>

      <NCard title={t('parents.profile.linkedChildren')} icon={UsersRound}>
        {linkedChildren.length === 0 ? (
          <NEmptyState surface="panel" icon={UsersRound} title={t('parents.profile.noChildrenLinked')} />
        ) : (
          <ul className="divide-y divide-border/60">
            {linkedChildren.map((child) => (
              <li key={child.id} className="flex items-center gap-2">
                <Link
                  href={`/students/${child.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <NAvatar
                    src={child.image}
                    fallback={child.name}
                    size="sm"
                    version={child.updatedAt}
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1 text-start">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {child.name || empty}
                      </span>
                      {child.status ? <NBadge status={child.status} /> : null}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {child.studentCode ? <span className="break-all" dir="auto">{child.studentCode}</span> : null}
                      {child.class?.name ? <span>{t('students.table.class')}: {child.class.name}</span> : null}
                      {child.section?.name ? <span>{t('students.table.section')}: {child.section.name}</span> : null}
                    </div>
                  </div>
                </Link>
                <FamilyUnlinkButton parentId={parent.id} studentId={child.id} name={child.name} />
              </li>
            ))}
          </ul>
        )}
      </NCard>
    </div>
  );
};

export default ParentDetailsTab;
