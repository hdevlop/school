"use client";

import React from 'react';
import { Phone, Mail, Wallet, MapPinned } from 'lucide-react';
import { NBadge, NAvatar, NSectionInfo, SimpleTooltip } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { getStaffAvatar } from '../utils/staffAvatar';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { currentAssignmentLabels, formatAssignments } from '../utils/staffAssignments';
import { avatarVersion } from '@/lib/avatarVersion';
import { PersonCard } from '@/shared/PersonCard';
import { CompactPersonCard, CompactTag, CompactValue, useCompactPersonCard } from '@/shared/CompactPersonCard';

const resolveRoleLabel = (staff, language, t) => {
  if (!staff?.role) return '-';
  if (staff.role === 'monitor') return t('staff.roles.monitor');
  const localized = staff?.roleLabels?.[language];
  if (localized) return localized;
  if (staff?.roleLabel) return staff.roleLabel;
  const key = `staff.roles.${staff.role}`;
  return t(key) === key ? staff.role : t(key);
};

const VISIBLE_ASSIGNMENTS = 6;

// One row on the card: the first few and a count of the rest, the whole list on hover or focus.
const AssignmentsSummary = ({ staff, language }) => {
  const labels = currentAssignmentLabels(staff, language);
  if (!labels.length) return '-';
  const hidden = labels.length - VISIBLE_ASSIGNMENTS;
  const all = labels.join(', ');
  return (
    <SimpleTooltip content={all}>
      <button type="button" aria-label={all} className="flex max-w-full min-w-0 cursor-help items-center gap-1">
        <span className="min-w-0 truncate">{labels.slice(0, VISIBLE_ASSIGNMENTS).join(', ')}</span>
        {hidden > 0 && (
          <NBadge className="shrink-0 rounded-full bg-primary/10 font-medium text-primary ring-1 ring-inset ring-primary/20">
            <bdi dir="ltr">+{hidden}</bdi>
          </NBadge>
        )}
      </button>
    </SimpleTooltip>
  );
};

const StaffCard = ({ data, details = false }) => {
  const { t, language } = useTranslation();
  const { majorMoney } = useSchoolFormat();
  const staff = data;
  // The details dialog always shows the full card.
  const compact = useCompactPersonCard() && !details;

  if (compact) {
    return (
      <CompactPersonCard
        avatar={(
          <NAvatar
            src={staff?.image}
            fallbackSrc={getStaffAvatar(staff?.role, staff?.gender)}
            fallback={staff?.name}
            size="md"
            version={avatarVersion(staff?.image, staff?.updatedAt)}
          />
        )}
        name={staff?.name}
        details={[
          <CompactTag key="role">{resolveRoleLabel(staff, language, t)}</CompactTag>,
          staff?.phone && <CompactValue>{staff.phone}</CompactValue>,
        ]}
        trailing={staff?.loginStatus === 'pending' && (
          <NBadge className="shrink-0 bg-amber-100 font-medium text-amber-900 ring-1 ring-inset ring-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-700">{t('staff.invitation.accessPending')}</NBadge>
        )}
      />
    );
  }

  // A contact fills the card's width: wrapped in the details view, cut there on the card.
  const contactRow = details
    ? { valueColor: 'min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]', className: 'flex-wrap items-start [&>svg]:shrink-0' }
    : { valueColor: 'min-w-0 truncate', className: '[&>svg]:shrink-0' };

  return (
    <PersonCard
      avatar={(
        <NAvatar
          src={staff?.image}
          fallbackSrc={getStaffAvatar(staff?.role, staff?.gender)}
          fallback={staff?.name}
          size="lg"
          version={avatarVersion(staff?.image, staff?.updatedAt)}
        />
      )}
      name={staff?.name}
      meta={(
        <>
          <NBadge className="inline-flex w-fit items-center rounded-full bg-primary/10 font-medium text-primary ring-1 ring-inset ring-primary/20">
            {resolveRoleLabel(staff, language, t)}
          </NBadge>
          {staff?.loginStatus === 'pending' && <NBadge className="w-fit bg-amber-100 font-medium text-amber-900 ring-1 ring-inset ring-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-700">{t('staff.invitation.accessPending')}</NBadge>}
        </>
      )}
    >
      <NSectionInfo
        icon={MapPinned}
        iconColor="text-muted-foreground"
        label={t('staff.table.assignments')}
        value={details
          ? <span className="whitespace-normal break-words">{formatAssignments(staff, language)}</span>
          : <AssignmentsSummary staff={staff} language={language} />}
        {...(details ? { className: 'flex-wrap items-start' } : contactRow)}
      />

      <NSectionInfo
        icon={Phone}
        iconColor="text-muted-foreground"
        label={t('staff.table.phone')}
        value={staff?.phone || '-'}
        maxChars={Infinity}
        {...contactRow}
      />

      <NSectionInfo
        icon={Mail}
        iconColor="text-muted-foreground"
        label={t('staff.form.email')}
        value={staff?.email || '-'}
        maxChars={Infinity}
        {...contactRow}
      />

      <NSectionInfo
        icon={Wallet}
        iconColor="text-primary"
        label={t('staff.table.salary')}
        value={majorMoney(staff?.salary)}
        valueColor="text-primary"
      />
    </PersonCard>
  );
};

export default StaffCard;
