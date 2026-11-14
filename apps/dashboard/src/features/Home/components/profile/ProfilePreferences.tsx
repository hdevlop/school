'use client';

import { useId } from 'react';
import { Bell, Languages } from 'lucide-react';
import { NButton, SegmentedControl, Switch } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { schoolI18n, type SchoolLocale } from '@sms/contracts/locales';
import { usePushOptIn } from '@/features/Notifications/usePushOptIn';
import { useUpdateLang } from '@/features/Settings/hooks/useUpdateLang';
import { ProfileRow, ProfileSection } from './ProfileRow';

/** What this account sets for itself: push on this device and the interface language. */
export function ProfilePreferences() {
  const { t, language } = useTranslation();
  const switchId = useId();
  const push = usePushOptIn();
  const { updateLang, isLoading: isUpdatingLang } = useUpdateLang();

  const languageOptions = schoolI18n.supportedLanguages.map((code) => ({
    value: code,
    label: code.toUpperCase(),
    ariaLabel: t(`languages.${code}`),
  }));

  return (
    <ProfileSection title={t('mobileHome.profile.preferences')}>
      <ProfileRow
        icon={Bell}
        label={t('notifications.pushTitle')}
        labelFor={switchId}
        action={(
          <>
            {push.failed && <NButton size="sm" variant="ghost" onClick={push.retry}>{t('common.feedback.retryLabel')}</NButton>}
            {/* Why the switch cannot move stays in its tooltip, not under the title. */}
            <Switch id={switchId} title={push.explanation} checked={push.enabled} disabled={!push.canToggle} onCheckedChange={(next) => void push.toggle(next)} />
          </>
        )}
      />
      <ProfileRow
        icon={Languages}
        label={t('mobileHome.profile.language')}
        action={(
          <SegmentedControl<SchoolLocale>
            size="sm"
            value={(language ?? 'en') as SchoolLocale}
            options={languageOptions}
            ariaLabel={t('navigation.changeLanguage')}
            disabled={isUpdatingLang}
            // `useUpdateLang` raises its own toast on failure.
            onChange={(next) => { if (next !== language) void updateLang(next).catch(() => undefined); }}
          />
        )}
      />
    </ProfileSection>
  );
}
