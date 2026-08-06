"use client";

import React from 'react';
import { Phone, Briefcase } from 'lucide-react';
import { Label, NAvatar, NBadge, SimpleTooltip } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';
import { getAvatarFallback, personAvatarClassNames } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

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
  const isOrphaned = parent.isOrphaned === true || Number(parent.totalChildren) === 0;
  const orphanMessage = t('parents.tooltips.orphaned');
  const mutedValueColor = isOrphaned ? 'text-muted-foreground' : 'text-foreground';

  const card = (
    <div
      role="link"
      tabIndex={0}
      aria-label={`View ${parent.name}`}
      onClick={() => router.push(`/parents/${parent.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          router.push(`/parents/${parent.id}`);
        }
      }}
      className={cn(
        'flex min-w-0 cursor-pointer items-start gap-4 overflow-hidden p-4 transition-all hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
        isOrphaned && 'bg-muted/60 text-muted-foreground [&_label]:text-muted-foreground'
      )}
      data-parent-orphan-card={isOrphaned ? 'true' : undefined}
    >

      <div className="shrink-0">
        <NAvatar src={data?.image} fallback={getAvatarFallback(parent.name)} size="lg" version={data?.updatedAt} classNames={personAvatarClassNames} />
      </div>

      <div className="min-w-0 flex-1 flex flex-col gap-2">

        <Label className={cn('text-md truncate font-bold', isOrphaned && 'text-muted-foreground')} title={parent.name}>
          {parent.name}
        </Label>

        <div className="flex items-center gap-2 flex-wrap">
          <NBadge look="dash" className={cn(isOrphaned && 'border-muted-foreground/30 bg-muted text-muted-foreground')}>
            {relationshipDisplay}
          </NBadge>
        </div>

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

      </div>
    </div>
  );

  if (!isOrphaned) return card;

  return (
    <SimpleTooltip content={orphanMessage} side="top">
      {card}
    </SimpleTooltip>
  );
};

export default ParentCard;
