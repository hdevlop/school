"use client";

import React from 'react';
import { Phone, Briefcase } from 'lucide-react';
import { NAvatar, NBadge, SimpleTooltip } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { cn } from 'najm-kit';
import { useRouter } from 'next/navigation';
import { avatarVersion } from '@/lib/avatarVersion';
import { PersonCard } from '@/shared/PersonCard';
import { CompactPersonCard, CompactTag, CompactValue, useCompactPersonCard } from '@/shared/CompactPersonCard';
import { isParentDisabled, isParentOrphaned } from '../config/parentActivity';

const ParentInfoRow = ({ icon: Icon, label, value, muted }) => (
  <div className="flex min-w-0 items-center gap-2 text-sm">
    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
    <span className="shrink-0 text-muted-foreground">{label}:</span>
    <span className={cn('min-w-0 flex-1 truncate', muted)}>
      {value || '-'}
    </span>
  </div>
);

const ParentCard = ({ data }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const compact = useCompactPersonCard();
  // Opening the parent keeps an explicitly viewed year.
  const parent = data;

  const relationshipLabels = {
    father: t('parents.relationships.father'),
    mother: t('parents.relationships.mother'),
    guardian: t('parents.relationships.guardian'),
    stepparent: t('parents.relationships.stepparent'),
    grandparent: t('parents.relationships.grandparent'),
    other: t('parents.relationships.other'),
  };

  const relationshipDisplay = relationshipLabels[parent.relationshipType] || parent.relationshipType;
  const isOrphaned = isParentOrphaned(parent);
  const isDisabled = isParentDisabled(parent);
  const inactiveMessage = t(isOrphaned ? 'parents.tooltips.orphaned' : 'parents.tooltips.leftSchool');
  const mutedValueColor = isDisabled ? 'text-muted-foreground' : 'text-foreground';
  const cardProps = {
    role: 'link',
    tabIndex: 0,
    'aria-label': `${t('common.view')} ${parent.name}`,
    onClick: () => router.push(`/parents/${parent.id}`),
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        router.push(`/parents/${parent.id}`);
      }
    },
    className: cn(
      'cursor-pointer overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
      isDisabled ? 'bg-muted/60 text-muted-foreground hover:bg-muted/80 [&_label]:text-muted-foreground' : 'hover:bg-primary/[0.035]'
    ),
    'data-parent-orphan-card': isOrphaned ? 'true' : undefined,
    'data-parent-inactive-card': isDisabled ? 'true' : undefined,
  };
  const initials = parent.name?.trim().split(/\s+/).map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase();
  const relationshipTag = isDisabled ? 'bg-muted text-muted-foreground' : undefined;

  const card = compact ? (
    <CompactPersonCard
      {...cardProps}
      avatar={<NAvatar src={data?.image} alt={parent.name} fallback={initials} size="md" version={avatarVersion(data?.image, data?.updatedAt)} />}
      name={parent.name}
      details={[
        relationshipDisplay && <CompactTag className={relationshipTag}>{relationshipDisplay}</CompactTag>,
        parent.phone && <CompactValue>{parent.phone}</CompactValue>,
      ]}
    />
  ) : (
    <PersonCard
      {...cardProps}
      avatar={(
        <NAvatar
          src={data?.image}
          alt={parent.name}
          fallback={initials}
          size="lg"
          version={avatarVersion(data?.image, data?.updatedAt)}
        />
      )}
      name={parent.name}
      meta={(
        <NBadge look="dash" className={cn(isDisabled && 'border-muted-foreground/30 bg-muted text-muted-foreground')}>
          {relationshipDisplay}
        </NBadge>
      )}
    >
      <ParentInfoRow
        icon={Phone}
        label={t('parents.table.phone')}
        value={parent.phone}
        muted={mutedValueColor}
      />

      <ParentInfoRow
        icon={Briefcase}
        label={t('parents.table.occupation')}
        value={parent.occupation}
        muted={mutedValueColor}
      />
    </PersonCard>
  );

  if (!isDisabled) return card;

  return (
    <SimpleTooltip content={inactiveMessage} side="top">
      {card}
    </SimpleTooltip>
  );
};

export default ParentCard;
