'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageIcon, Palette } from 'lucide-react';
import { NConfirmDialog, NSheet } from 'najm-kit';
import {
  NThemeAppearanceSettings,
  NThemeBrandingSettings,
  NThemePresetSettings,
  NThemeSettingsActions,
  NThemeSettingsProvider,
  useNThemeSettingsOptional,
} from 'najm-theme/react';
import { useTranslation } from 'najm-i18n/react';

export type ThemeSettingsSheet = 'theme' | 'branding';

function ThemeSheets({
  activeSheet,
  onActiveSheetChange,
}: Readonly<{
  activeSheet: ThemeSettingsSheet;
  onActiveSheetChange: (sheet: ThemeSettingsSheet | null) => void;
}>) {
  const { t } = useTranslation();
  const theme = useNThemeSettingsOptional();
  const [confirmClose, setConfirmClose] = useState(false);

  const close = () => {
    if (theme?.dirty.appearance || theme?.dirty.branding) {
      setConfirmClose(true);
      return;
    }
    onActiveSheetChange(null);
  };

  const discardAndClose = async () => {
    await theme?.discardDrafts();
    setConfirmClose(false);
    onActiveSheetChange(null);
  };

  return (
    <>
      <NSheet
        open={activeSheet === 'theme'}
        onOpenChange={(open) => { if (!open) close(); }}
        icon={Palette}
        title={t('navigation.theme')}
        width={640}
        classNames={{ body: 'px-4', content: 'bg-background' }}
        footer={
          <NThemeSettingsActions
            resources={['appearance']}
            display="compact"
            showStatus={false}
            showFileActions
            showDiscard={false}
          />
        }
      >
        <div className="flex flex-col gap-4">
          <NThemePresetSettings showApplyAction={false} />
          <NThemeAppearanceSettings showTabs showFileActions={false} showResetAction={false} />
        </div>
      </NSheet>
      <NSheet
        open={activeSheet === 'branding'}
        onOpenChange={(open) => { if (!open) close(); }}
        icon={ImageIcon}
        title={t('navigation.branding')}
        width={560}
        classNames={{ body: 'px-4', content: 'bg-background' }}
        footer={
          <NThemeSettingsActions
            resources={['branding']}
            display="compact"
            showStatus={false}
            showDiscard={false}
          />
        }
      >
        <NThemeBrandingSettings className="!grid-cols-2 max-[24rem]:!grid-cols-1" />
      </NSheet>
      <NConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title={t('themeSheets.discardTitle')}
        description={t('themeSheets.discardDescription')}
        confirmLabel={t('themeSheets.discard')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        onConfirm={discardAndClose}
      />
    </>
  );
}

export function ThemeSettingsSheets({
  activeSheet,
  onActiveSheetChange,
  role,
}: Readonly<{
  activeSheet: ThemeSettingsSheet | null;
  onActiveSheetChange: (sheet: ThemeSettingsSheet | null) => void;
  role: string;
}>) {
  const { t, language } = useTranslation();
  const router = useRouter();

  if (role !== 'admin' || !activeSheet) return null;

  return (
    <NThemeSettingsProvider
      client={{ baseUrl: '/api' }}
      language={language}
      t={t}
      onPersisted={() => router.refresh()}
    >
      <ThemeSheets activeSheet={activeSheet} onActiveSheetChange={onActiveSheetChange} />
    </NThemeSettingsProvider>
  );
}
