'use client';

import { Copy, Mail, Phone } from 'lucide-react';
import { NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { ProfileRow, ProfileSection } from './ProfileRow';

/** The account's own email and phone, each copyable as written. */
export function ProfileContact({ email, phone }: { email?: string | null; phone?: string | null }) {
  const { t } = useTranslation();
  if (!email && !phone) return null;

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('mobileHome.profile.copied'));
    } catch {
      // No clipboard outside a secure context, or the browser refused it.
      toast.error(t('mobileHome.profile.copyFailed'));
    }
  };
  const copyButton = (value: string, label: string) => (
    <NButton type="button" size="icon" variant="outline" className="size-9 rounded-xl" aria-label={label} title={label} onClick={() => void copy(value)}>
      <Copy className="size-4" aria-hidden="true" />
    </NButton>
  );

  return (
    <ProfileSection title={t('mobileHome.profile.contact')}>
      {email && (
        <ProfileRow
          icon={Mail}
          label={t('users.table.email')}
          value={<bdi dir="ltr" className="block break-all font-medium text-foreground">{email}</bdi>}
          action={copyButton(email, t('mobileHome.profile.copyEmail'))}
        />
      )}
      {phone && (
        <ProfileRow
          icon={Phone}
          label={t('teachers.form.phone')}
          value={<bdi dir="ltr" className="font-medium text-foreground">{phone}</bdi>}
          action={copyButton(phone, t('mobileHome.profile.copyPhone'))}
        />
      )}
    </ProfileSection>
  );
}
