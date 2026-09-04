'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from 'najm-kit';
import { NThemeSettings, NThemeSettingsProvider } from 'najm-theme/react';

import { useTranslation } from 'najm-i18n/react';

/**
 * Appearance, branding, and saved presets — all owned by `najm-theme`.
 *
 * Mounted beside School's product settings rather than inside the settings
 * form: the package persists each resource against its own revision through its
 * own routes, so folding it into the one Save button would mean reporting a
 * branding conflict as a failure of the academic settings save.
 *
 * `t` is School's translator so an application that has translated a theme
 * label wins; every key it has no entry for falls through to the package's own
 * catalog for the active language.
 */
const AppearanceSection: React.FC = () => {
  const router = useRouter();
  const { t, language } = useTranslation();

  return (
    <Card className="flex flex-col gap-3 p-4">
      <NThemeSettingsProvider
        client={{ baseUrl: '/api' }}
        language={language}
        t={t}
        // The client providers already hold the new design by the time this
        // runs; the refresh is what re-renders the server snapshot the next
        // navigation would otherwise be the first to see.
        onPersisted={() => router.refresh()}
      >
        <NThemeSettings layout="tabs" />
      </NThemeSettingsProvider>
    </Card>
  );
};

export default AppearanceSection;
