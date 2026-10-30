"use client";

import React from 'react';
import { Phone, Mail, Wallet, MapPinned } from 'lucide-react';
import { NBadge, Label, NAvatar, NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { getStaffAvatar } from '../utils/staffAvatar';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { formatAssignments } from '../utils/staffAssignments';
import { avatarVersion } from '@/lib/avatarVersion';

const resolveRoleLabel = (staff, language, t) => {
  if (!staff?.role) return '-';
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

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="shrink-0">
        <NAvatar
          src={staff?.image}
          fallbackSrc={getStaffAvatar(staff?.role, staff?.gender)}
          fallback={staff?.name}
          size="lg"
          version={avatarVersion(staff?.image, staff?.updatedAt)}
        />
      </div>

      <div className="min-w-0 flex-1 flex flex-col gap-2">

        <div className='flex flex-col gap-1'>
          <Label className="text-md font-bold">
            {staff?.name}
          </Label>

          <NBadge className="inline-flex w-fit items-center rounded-full bg-primary/10 font-medium text-primary ring-1 ring-inset ring-primary/20">
            {resolveRoleLabel(staff, language, t)}
          </NBadge>
        </div>

        <div className="space-y-2">

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
            maxChars={details ? Infinity : 12}
            valueColor={details ? 'min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]' : undefined}
            className={details ? 'flex-wrap items-start [&>svg]:shrink-0' : undefined}
          />

          <NSectionInfo
            icon={Mail}
            iconColor="text-muted-foreground"
            label={t('staff.form.email')}
            value={staff?.email || '-'}
            maxChars={details ? Infinity : 22}
            valueColor={details ? 'min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]' : undefined}
            className={details ? 'flex-wrap items-start [&>svg]:shrink-0' : undefined}
          />

          <NSectionInfo
            icon={Wallet}
            iconColor="text-primary"
            label={t('staff.table.salary')}
            value={majorMoney(staff?.salary)}
            valueColor="text-primary"
          />

        </div>
      </div>
    </div>
  );
};

export default StaffCard;
