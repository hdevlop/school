"use client";

import { Clock, LogIn, Mail, Phone } from 'lucide-react';
import { NAvatar, NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { avatarVersion } from '@/lib/avatarVersion';

/**
 * Compact enough for five per row: who the account is, how it signs in, and
 * how often it has. The account id is in the View dialog.
 */
const UserCard = ({ data: user }) => {
  const { t } = useTranslation();
  // An account signs in with its email, or with its phone when it has none.
  const contact = user.email || user.phone;
  const ContactIcon = user.email ? Mail : Phone;

  return (
    <div className="flex flex-col">
      {/* End padding keeps the name clear of the card's menu button. */}
      <div className="flex items-center gap-3 p-3 pe-10">
        <NAvatar src={user.image} fallback={user.name} size="md" version={avatarVersion(user.image, user?.updatedAt)} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-sm font-semibold" title={user.name}>{user.name}</p>
          <div className="flex min-w-0 items-center gap-2">
            {user.role && (
              <span className="truncate rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{user.role}</span>
            )}
            <NBadge status={user.status} look="minimal" />
          </div>
          {contact && (
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground" title={contact}>
              <ContactIcon className="size-3.5 shrink-0" />
              <bdi dir="ltr" className="truncate">{contact}</bdi>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-dashed border-border/50 px-3 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <LogIn className="size-3.5" />
          <span className="font-medium text-foreground">{user?.analytics?.totalLogins || 0}</span>
          {t('users.card.logins')}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          <span className="font-medium text-foreground">{user?.analytics?.totalSessions || 0}</span>
          {t('users.card.sessions')}
        </span>
      </div>
    </div>
  );
};

export default UserCard;
