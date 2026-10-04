"use client";

import React from 'react';
import { Phone, Mail, Wallet } from 'lucide-react';
import { NBadge, Label, NAvatar, NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { getStaffAvatar } from '../utils/staffAvatar';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

const resolveRoleLabel = (staff, language, t) => {
  if (!staff?.role) return '-';
  const localized = staff?.roleLabels?.[language];
  if (localized) return localized;
  if (staff?.roleLabel) return staff.roleLabel;
  const key = `staff.roles.${staff.role}`;
  return t(key) === key ? staff.role : t(key);
};

const StaffCard = ({ data }) => {
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
          version={staff?.updatedAt}
        />
      </div>

      <div className="flex-1 flex flex-col gap-2">

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
            icon={Phone}
            iconColor="text-muted-foreground"
            label={t('staff.table.phone')}
            value={staff?.phone || '-'}
          />

          <NSectionInfo
            icon={Mail}
            iconColor="text-muted-foreground"
            label={t('staff.form.email')}
            value={staff?.email || '-'}
            maxChars={22}
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
