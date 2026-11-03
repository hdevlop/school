"use client";

import React from 'react';
import { Phone, Mail, Wallet, MapPinned } from 'lucide-react';
import { NBadge, NAvatar, NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { getStaffAvatar } from '../utils/staffAvatar';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { formatAssignments } from '../utils/staffAssignments';
import { avatarVersion } from '@/lib/avatarVersion';
import { PersonCard } from '@/shared/PersonCard';

const resolveRoleLabel = (staff, language, t) => {
  if (!staff?.role) return '-';
  if (staff.role === 'floorManager') return t('staff.roles.floorManager');
  const localized = staff?.roleLabels?.[language];
  if (localized) return localized;
  if (staff?.roleLabel) return staff.roleLabel;
  const key = `staff.roles.${staff.role}`;
  return t(key) === key ? staff.role : t(key);
};

const StaffCard = ({ data, details = false }) => {
  const { t, language } = useTranslation();
  const { majorMoney } = useSchoolFormat();
  const staff = data;

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
        value={<span className="whitespace-normal break-words">{formatAssignments(staff, language)}</span>}
        className="flex-wrap items-start"
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
