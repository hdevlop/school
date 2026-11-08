'use client';
import type { ReactNode } from 'react';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { NErrorState, NForbiddenState, SelectInput } from 'najm-kit';
import { SchoolPageHeader } from '@/components/SchoolPageHeader';
import { useTranslation } from 'najm-i18n/react';
import { isAuthorizationError } from '@/services/apiError';
import styles from './Massar.module.css';

export function MassarHeader({ title, subtitle, actions }: { title: string; subtitle?: string; active?: 'rounds' | 'sheets' | 'setup'; actions?: ReactNode }) {
  return <header className={styles.header}><SchoolPageHeader icon={FEATURE_ICONS.massar} title={title} subtitle={subtitle} actions={actions} /></header>;
}
/** Holds the page's shape while it loads: the card with the Contrôle and the classes, then the sheet. */
export function MassarLoadingSkeleton({ label }: { label: string }) {
  const bone = (width: number | string, height: number, round = false) => <span className={styles.bone} data-round={round || undefined} style={{ width, height }} />;
  return <div className={styles.skeleton} role="status" aria-live="polite" aria-busy="true" data-massar-loading>
    <span className="sr-only">{label}</span>
    <div className={styles.sheetLayout} aria-hidden>
      <aside className={styles.sideColumn}>
        <section className={styles.sideSection}>{bone(70, 9)}{bone('100%', 46)}</section>
        <section className={styles.sideSection}>{bone(60, 9)}
          {[0, 1, 2, 3, 4, 5, 6, 7].map(row => <div key={row} className={styles.skeletonClass}>{bone(8, 8, true)}<span>{bone(56, 10)}{bone('100%', 4, true)}</span>{bone(40, 18, true)}</div>)}
        </section>
      </aside>
      <section className={styles.skeletonPaper}>
        <div className={styles.skeletonPaperHead}>{bone(110, 10)}{bone(240, 16)}</div>
        <div className={styles.skeletonRow} data-head>{bone(84, 10)}{bone(72, 10)}{bone(72, 10)}</div>
        {[0, 1, 2, 3, 4, 5, 6].map(row => <div key={row} className={styles.skeletonRow}>{bone(28, 12)}{bone(90, 12)}{bone(130, 12)}<span className={styles.skeletonMarks}>{[0, 1, 2, 3, 4].map(cell => <span key={cell}>{bone('100%', 26)}</span>)}</span></div>)}
      </section>
    </div>
  </div>;
}
export function MassarSelect({ label, ariaLabel, value, onChange, items, disabled, placeholder }: { label?: string; ariaLabel?: string; value: string; onChange: (value: string) => void; items: Array<{ value: string; label: string }>; disabled?: boolean; placeholder?: string }) {
  return <div className={styles.field}>{label && <span>{label}</span>}<SelectInput value={value} onChange={onChange} items={items} disabled={disabled} placeholder={placeholder} ariaLabel={ariaLabel ?? label} showIcon={false} /></div>;
}
export function MassarBadge({ status, children }: { status: string; children: ReactNode }) {
  return <span className={styles.badge} data-status={status}>{children}</span>;
}
export function MassarLoadError({ retry, error }: { retry: () => unknown; error?: unknown }) {
  const { t } = useTranslation();
  return <div role="alert">{isAuthorizationError(error) ? <NForbiddenState surface="panel" /> : <NErrorState surface="panel" title={t('massar.loadFailed')} onRetry={() => { void retry(); }} retryLabel={t('massar.retry')} />}</div>;
}
export function tableErrorProps(error: unknown, retry: () => unknown) {
  return { error, renderError: () => <MassarLoadError retry={retry} /> };
}
