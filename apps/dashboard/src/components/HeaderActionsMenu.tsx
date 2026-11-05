'use client';

import type { CSSProperties, ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn, NButton, Popover, PopoverContent, PopoverTrigger } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { FeatureActionSlots, useFeatureActions } from '@/shared/FeatureActions';
import styles from './HeaderActionsMenu.module.css';

/** CSS strings for the captions shown under the menu's icon-only global controls. */
function useQuickLabels(): CSSProperties {
  const { t, language } = useTranslation();
  const label = (value: string) => JSON.stringify(value);
  return {
    '--menu-label-alerts': label(t('common.menuAlerts')),
    '--menu-label-language': label((language ?? 'en').toUpperCase()),
    '--menu-label-dark': label(t('common.menuDark')),
    '--menu-label-light': label(t('common.menuLight')),
    '--menu-label-fullscreen': label(t('common.menuFullscreen')),
  } as CSSProperties;
}

export function HeaderActionsMenu({ children, contentClassName }: { children: ReactNode; contentClassName?: string }) {
  const { t } = useTranslation();
  const featureActions = useFeatureActions();
  const quickLabels = useQuickLabels();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <NButton type="button" size="icon" variant="ghost" className="size-11" aria-label={t('common.actions')}>
          <MoreVertical className="size-5" aria-hidden />
        </NButton>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label={t('common.actions')} className={cn(styles.menu, 'max-h-[calc(100dvh-6rem)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl p-2', featureActions?.slots.length ? 'w-72' : 'w-auto', contentClassName)}>
        <FeatureActionSlots />
        <div data-menu-quick="" style={quickLabels} className="flex max-w-full flex-wrap items-center gap-2 [&_button]:min-h-11 [&_button]:min-w-11 [&_[data-slot=fullscreen-toggle]]:inline-flex">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}
