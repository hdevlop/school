'use client';
import Link from 'next/link';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { NButton } from 'najm-kit';
import { SchoolPageHeader } from '@/components/SchoolPageHeader';
import { useTranslation } from 'najm-i18n/react';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { PAGE_ACCESS } from '@/shared/pageAccess';

export function MassarHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { t } = useTranslation(), viewer = useViewerRole();
  return <><SchoolPageHeader icon={FEATURE_ICONS.massar} title={title} subtitle={subtitle} /><nav aria-label={t('massar.title')} className="flex flex-wrap gap-4 text-sm text-primary">
    {PAGE_ACCESS.massarRounds(viewer) && <Link href="/massar/rounds">{t('massar.rounds')}</Link>}
    {PAGE_ACCESS.massarSheets(viewer) && <Link href="/massar/sheets">{t(viewer.role === 'teacher' ? 'massar.mySheets' : 'massar.allSheets')}</Link>}
    {PAGE_ACCESS.massarSetup(viewer) && <Link href="/massar/setup">{t('massar.setup')}</Link>}
  </nav></>;
}
export function MassarLoadError({ retry }: { retry: () => unknown }) {
  const { t } = useTranslation();
  return <div role="alert" className="space-y-3 rounded-lg border border-destructive p-5"><p>{t('massar.loadFailed')}</p><NButton variant="outline" onClick={() => { void retry(); }}>{t('massar.retry')}</NButton></div>;
}
export function tableErrorProps(error: unknown, retry: () => unknown) {
  return { error, renderError: () => <MassarLoadError retry={retry} /> };
}
export const massarControlClass = 'min-h-10 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm';
