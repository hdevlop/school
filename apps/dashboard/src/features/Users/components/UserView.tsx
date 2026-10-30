"use client";

import { Hash, Mail, Phone, Shield, User, UserCheck } from 'lucide-react';
import { Card, NAvatar, NBadge, NEmptyState, NSection, NSectionInfo } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { avatarVersion } from '@/lib/avatarVersion';

const UserView = ({ user }) => {
  const { t } = useTranslation();

  if (!user) return <NEmptyState title={t('users.errors.notFound')} />;

  return (
    <div className="flex flex-col gap-4 h-full w-full overflow-auto">
      <Card className="flex p-5 items-center flex-col md:flex-row md:gap-4">
        <NAvatar src={user.image} fallback={user.name} size="xl" version={avatarVersion(user.image, user.updatedAt)} />
        <div className="flex flex-col items-center md:items-start md:gap-0.5 min-w-0">
          <p className="text-2xl font-bold break-words">{user.name}</p>
          <p className="break-all">{user.email}</p>
          <NBadge status={user.status} look="minimal" />
        </div>
      </Card>
      <NSection
        icon={User}
        title={t('users.view.accountInformation')}
        iconColor="text-blue-500"
        background="bg-card"
        className="border shadow-sm"
      >
        <NSectionInfo icon={Hash} label={t('users.table.id')} value={user.id} />
        {user.email && <NSectionInfo icon={Mail} label={t('users.table.email')} value={user.email} />}
        {user.phone && <NSectionInfo icon={Phone} label={t('teachers.form.phone')} value={user.phone} />}
        <NSectionInfo icon={Shield} label={t('users.table.role')} value={user.role || t('common.notAssigned')} />
        <NSectionInfo icon={UserCheck} label={t('users.table.status')} value={<NBadge status={user.status} />} />
      </NSection>
    </div>
  );
};

export default UserView;
