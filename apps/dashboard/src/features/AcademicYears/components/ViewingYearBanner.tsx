'use client';

import { useTranslation } from 'najm-i18n/react';
import { useViewingAcademicYear } from '../hooks/useViewingAcademicYear';
import { useYearSelectionStore } from '../store/yearSelectionStore';

const bannerClassName =
  'mx-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground';
const actionClassName = 'ms-auto font-medium text-primary underline-offset-2 hover:underline';

/**
 * Explains when a saved year this role may not use was replaced by the active one.
 */
export function ViewingYearBanner() {
  const { t } = useTranslation();
  const { activeYear } = useViewingAcademicYear();
  const droppedUnauthorized = useYearSelectionStore((state) => state.droppedUnauthorized);
  const dismissNotice = useYearSelectionStore((state) => state.dismissNotice);

  if (!droppedUnauthorized) return null;

  return (
    <div role="status" className={bannerClassName}>
      <span>{t('academicYearViewing.resetToActive', { year: activeYear })}</span>
      <button type="button" className={actionClassName} onClick={dismissNotice}>
        {t('common.close')}
      </button>
    </div>
  );
}
