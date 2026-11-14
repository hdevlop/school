'use client';

import type { ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn, NButton, Popover, PopoverContent, PopoverTrigger } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { FeatureActionSlots, useFeatureActions } from '@/shared/FeatureActions';
import styles from './HeaderActionsMenu.module.css';

/**
 * The phone header's ⋮ menu: the page's own commands. The global controls
 * (alerts, language, theme, fullscreen) stay out of it; they live in the
 * sidebar and settings. With nothing of the page's to offer, there is no ⋮.
 */
export function HeaderActionsMenu({ children, contentClassName, hasOwnActions = true }: {
  children: ReactNode;
  contentClassName?: string;
  /** False when `children` holds only global controls, which the menu hides. */
  hasOwnActions?: boolean;
}) {
  const { t } = useTranslation();
  const featureActions = useFeatureActions();
  if (!hasOwnActions && !featureActions?.slots.length) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <NButton type="button" size="icon" variant="ghost" className="size-11" aria-label={t('common.actions')}>
          <MoreVertical className="size-5" aria-hidden />
        </NButton>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label={t('common.actions')} className={cn(styles.menu, 'max-h-[calc(100dvh-6rem)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl p-2', featureActions?.slots.length ? 'w-72' : 'w-auto', contentClassName)}>
        <FeatureActionSlots />
        <div data-menu-quick="" className="flex max-w-full flex-wrap items-center gap-2 empty:hidden [&_button]:min-h-11 [&_button]:min-w-11">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}
