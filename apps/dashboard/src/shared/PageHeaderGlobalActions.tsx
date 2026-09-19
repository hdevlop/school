'use client';

import { NFullscreenToggle, NGlobalActions, NThemeToggle, toast } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import LanguageSwitcher from '@/features/Settings/components/LanguageSwitcher';
import { NotificationsMenu } from '@/features/Notifications';

export default function PageHeaderGlobalActions() {
  const { t } = useTranslation();

  return (
    <NGlobalActions>
      <NotificationsMenu />
      <LanguageSwitcher />
      <NThemeToggle
        label={t('common.toggleTheme')}
        onError={(error) =>
          toast.error(error instanceof Error ? error.message : 'Could not update color theme.')
        }
      />
      <NFullscreenToggle label={t('common.toggleFullscreen')} />
    </NGlobalActions>
  );
}
