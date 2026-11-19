'use client';

import { NFullscreenToggle, NGlobalActions, NThemeToggle, toast } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import LanguageSwitcher from '@/features/Settings/components/LanguageSwitcher';
import { NotificationsMenu } from '@/features/Notifications';
import { ViewingYearSelector } from '@/features/AcademicYears/components/ViewingYearSelector';

export default function PageHeaderGlobalActions({ fullscreenOnly = false }: { fullscreenOnly?: boolean }) {
  const { t } = useTranslation();

  return (
    <>
      {!fullscreenOnly && <ViewingYearSelector placement="header" />}
      <NGlobalActions>
        {!fullscreenOnly && (
          <>
            <NotificationsMenu />
            <LanguageSwitcher />
            <NThemeToggle
              label={t('common.toggleTheme')}
              onError={(error) =>
                toast.error(error instanceof Error ? error.message : 'Could not update color theme.')
              }
            />
          </>
        )}
        <NFullscreenToggle label={t('common.toggleFullscreen')} />
      </NGlobalActions>
    </>
  );
}

/** The phone's ⋮ menu leaves these out (see SchoolPageHeader). */
PageHeaderGlobalActions.globalActions = true;
