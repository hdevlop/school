"use client";

import { User, Mail, Shield, Hash, Phone, Calendar } from 'lucide-react';
import { NAvatar, NStatCard, NBadge } from 'najm-kit';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';
import { getAvatarFallback } from '@/lib/avatar';
import { NSection, NSectionInfo } from 'najm-kit';
import { Label } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';

const UserHeader = ({ user }) => {
  return (
    <div className="flex flex-col items-center border-none md:flex-row md:gap-4">
      <NAvatar src={user.image} fallback={getAvatarFallback(user.name)} size="lg" version={user?.updatedAt} />
      <div className="flex flex-col justify-center items-center md:items-start">
        <Label className="text-md font-bold">{user.name}</Label>
        <Label className="text-sm ">{user.email}</Label>
        <NBadge status={user.status} statusMap={STATUS_COLOR_MAP} look="minimal" />
      </div>
    </div>
  );
};

const UserCard = ({ data }) => {
  const { t } = useTranslation();
  const user = data;

  const totalLogins = user?.analytics?.totalLogins || 0;
  const totalSessions = user?.analytics?.totalSessions || 0;

  return (
    <div className="flex flex-col gap-4 p-4">

      <UserHeader user={user} />

      <div className="grid grid-cols-2 gap-4">
        <NStatCard
          variant="compact"
          icon={User}
          label="Total Logins"
          value={totalLogins}
          iconColor="text-blue-500"
        />
        <NStatCard
          variant="compact"
          icon={Calendar}
          label="Sessions"
          value={totalSessions}
          iconColor="text-green-500"
        />
      </div>

      {/* Account Information */}
      <NSection
        icon={User}
        title="Account Information"
        iconColor="text-blue-400"
        background="bg-foreground/10"
      >
        <NSectionInfo
          icon={Hash}
          label={t('users.table.id')}
          value={user.id}
          valueColor="text-muted-foreground"
          iconColor="text-muted-foreground/60"
        />

        <NSectionInfo
          icon={Mail}
          label={t('users.table.email')}
          value={user.email}
          valueColor="text-muted-foreground"
          iconColor="text-muted-foreground/60"
        />

        <NSectionInfo
          icon={Phone}
          label="Phone"
          value={user.phone}
          valueColor="text-muted-foreground"
          iconColor="text-muted-foreground/60"
        />

        <NSectionInfo
          icon={Shield}
          label={t('users.table.role')}
          value={user.role}
          valueColor="text-primary font-medium"
          iconColor="text-muted-foreground/60"
        />

      </NSection>
    </div>
  );
};

export default UserCard;
