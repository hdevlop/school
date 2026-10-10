"use client";

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { HeartHandshake, Phone, UserRound, UsersRound } from 'lucide-react';
import { NAvatar, NBadge, NCard, NEmptyState, NTable } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
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
  const router = useRouter();
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

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: t('students.table.name'),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="flex min-w-0 items-center gap-2">
          <NAvatar src={row.original.image} fallback={row.original.name} size="sm" version={row.original.updatedAt} />
          <span className="truncate font-medium text-foreground">{row.original.name}</span>
        </span>
      ),
    },
    { accessorKey: 'studentCode', header: t('students.table.studentCode'), enableSorting: true },
    {
      id: 'class',
      accessorFn: (row) => row.class?.name ?? '',
      header: t('students.table.class'),
      enableSorting: true,
    },
    {
      id: 'section',
      accessorFn: (row) => row.section?.name ?? '',
      header: t('students.table.section'),
      enableSorting: true,
    },
    {
      accessorKey: 'status',
      header: t('students.table.status'),
      cell: ({ getValue }) => (getValue() ? <NBadge status={getValue() as string} /> : null),
    },
  ], [t]);

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

      <NCard title={t('parents.profile.linkedChildren')} icon={UsersRound} className="lg:flex-1">
        {linkedChildren.length === 0 ? (
          <NEmptyState surface="panel" icon={UsersRound} title={t('parents.profile.noChildrenLinked')} />
        ) : (
          <NTable
            data={linkedChildren}
            columns={columns}
            getRowId={(row) => row.id}
            onRowClick={(row) => router.push(`/students/${row.id}`)}
            showCheckbox={false}
            showViewToggle={false}
            dynamicHeight={false}
            showPagination={false}
            availableModes={['table']}
          />
        )}
      </NCard>
    </div>
  );
};

export default ParentDetailsTab;
