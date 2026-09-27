'use client';

import { useTranslation } from 'najm-i18n/react';
import { useSetViewingYear, useViewingAcademicYear } from '../hooks/useViewingAcademicYear';
import { useYearSelectionStore } from '../store/yearSelectionStore';

const bannerClassName =
  'mx-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground';
const actionClassName = 'ms-auto font-medium text-primary underline-offset-2 hover:underline';

/**
 * Keeps a year other than the active one visible above every page, and says
 * so when a saved year this role may not use was replaced by the active one.
 */
export function ViewingYearBanner() {
  const { t } = useTranslation();
  const { isExplicit, viewingYear, activeYear } = useViewingAcademicYear();
  const setViewingYear = useSetViewingYear();
  const droppedUnauthorized = useYearSelectionStore((state) => state.droppedUnauthorized);
  const dismissNotice = useYearSelectionStore((state) => state.dismissNotice);

  if (droppedUnauthorized) {
    return (
      <div role="status" className={bannerClassName}>
        <span>{t('academicYearViewing.resetToActive', { year: activeYear })}</span>
        <button type="button" className={actionClassName} onClick={dismissNotice}>
          {t('common.close')}
        </button>
      </div>
    );
  }

  if (!isExplicit || viewingYear === activeYear) return null;

  return (
    <div role="status" className={bannerClassName}>
      <span className="font-medium">{t('academicYearViewing.viewing', { year: viewingYear })}</span>
      <span className="text-muted-foreground">{t('academicYearViewing.active', { year: activeYear })}</span>
      <button type="button" className={actionClassName} onClick={() => setViewingYear(undefined)}>
        {t('academicYearViewing.returnToActive')}
      </button>
    </div>
  );
}
