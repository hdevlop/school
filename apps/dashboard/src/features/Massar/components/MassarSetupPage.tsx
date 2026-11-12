'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, FileText, Link2 } from 'lucide-react';
import { NButton, NEmptyState } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { MassarPlan, MassarRound, MassarSetup, MassarStatementSettings } from '@sms/contracts';
import { ViewingYearSelector } from '@/features/AcademicYears/components/ViewingYearSelector';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { massarPut, useMassarAction, useMassarRead } from '../hooks/useMassar';
import { MassarMappingEditor } from './MassarMappingEditor';
import { MassarPlanEditor } from './MassarPlanEditor';
import { MassarStatementEditor } from './MassarStatementEditor';
import type { PlannedRound } from '../config/massarModel';
import { MassarHeader, MassarLoadError, MassarLoadingSkeleton } from './MassarShared';
import styles from './Massar.module.css';

type SettingsView = 'mappings' | 'controls' | 'statements';
const VIEWS: readonly SettingsView[] = ['mappings', 'controls', 'statements'];
const VIEW_KEY = 'massar-settings-tab';

/**
 * Académique → Réglages Massar. A column on the side lists what is set here:
 * which School class, section and subject each Massar class and subject stands
 * for (the import makes these links; a wrong one is corrected here), the year's
 * Contrôles and their due dates, and how each student's statement prints. Every
 * part stays loaded, so a change not yet saved survives moving to another; the
 * open one is kept for the next visit.
 */
export function MassarSettingsPage() {
  const { t } = useTranslation(), action = useMassarAction(), router = useRouter();
  const { data: setup, error, isLoading, refetch } = useMassarRead<MassarSetup>('/setup', true);
  const { data: availability } = useMassarRead<{ plan?: MassarPlan | null; planned?: PlannedRound[]; statement?: MassarStatementSettings | null }>('/availability', true), { data: rounds } = useMassarRead<MassarRound[]>('/rounds', true);
  const [view, setView] = useState<SettingsView>('mappings');
  useEffect(() => {
    try { const stored = localStorage.getItem(VIEW_KEY) as SettingsView | null; if (stored && VIEWS.includes(stored)) setView(stored); } catch { /* Storage can be unavailable in private browsing. */ }
  }, []);
  const choose = (next: SettingsView) => {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* The view still changes for this visit. */ }
  };
  const total = setup ? setup.classes.length + setup.subjects.length : 0;
  const unmapped = setup ? setup.classes.filter(cls => !cls.classId || !cls.sectionId).length + setup.subjects.filter(subject => !subject.subjectId).length : 0;
  const controls = availability?.planned?.length ?? 0;
  const item = (value: SettingsView, Icon: typeof Link2, label: string, extra?: React.ReactNode) => <button type="button" className={styles.settingsNavItem} aria-current={view === value ? 'page' : undefined} onClick={() => choose(value)}>
    <Icon aria-hidden /><span>{label}</span>{extra}
  </button>;
  return <div className={styles.page} data-massar-page="settings">
    <MassarHeader title={t('massar.flow.settings')} subtitle={setup && total ? t('massar.flow.settingsSubtitle') : undefined} actions={<div className={styles.actions}><ViewingYearSelector placement="header" /></div>} />
    <main className={styles.scroll}><div className={`${styles.main} ${styles.settings}`} data-fill={view === 'statements' ? 'true' : undefined}>
      {error ? <MassarLoadError error={error} retry={() => refetch()} /> : isLoading || !setup ? <MassarLoadingSkeleton label={t('massar.loading')} />
        : !total ? <div className={styles.emptyWrap}><NEmptyState surface="panel" icon={FEATURE_ICONS.massar} title={t('massar.flow.noFiles')} description={t('massar.flow.settingsEmpty')}
          action={<NButton onClick={() => router.push('/massar')}>{t('massar.flow.goToMassar')}</NButton>} /></div>
        : <div className={styles.settingsLayout}>
          <nav className={styles.settingsNav} aria-label={t('massar.flow.settings')}>
            {item('mappings', Link2, t('massar.flow.settingsTabs.mappings'), unmapped ? <span className={styles.tabCount} data-tone="warning" title={t('massar.ui.mappingCount', { count: total - unmapped, total })}>{unmapped}</span> : null)}
            {item('controls', CalendarDays, t('massar.flow.settingsTabs.controls'), controls ? <span className={styles.tabCount}>{controls}</span> : null)}
            {item('statements', FileText, t('massar.flow.settingsTabs.statements'))}
          </nav>
          <div className={styles.settingsContent}>
            <div hidden={view !== 'mappings'}>
              <div className={styles.settingsStack}>
                <p className={styles.tabIntro}>{t('massar.flow.settingsHelp')}</p>
                <div className={styles.settingsPanel}>
                  <MassarMappingEditor key={JSON.stringify([setup.classes, setup.subjects])} setup={setup} pending={action.pending}
                    initial={{ classes: setup.classes.map(cls => ({ name: cls.name, classId: cls.classId, sectionId: cls.sectionId })), subjects: setup.subjects.map(subject => ({ level: setup.levels.find(level => level.id === subject.levelId)?.code ?? '', code: subject.code, subjectId: subject.subjectId })) }}
                    submit={async mappings => { await action.run(() => massarPut('/mappings', mappings)); }} />
                </div>
              </div>
            </div>
            <div hidden={view !== 'controls'}>
              {availability && rounds ? <MassarPlanEditor key={JSON.stringify(availability.plan ?? null)} plan={availability.plan ?? null} planned={availability.planned ?? []} rounds={rounds} /> : <MassarLoadingSkeleton label={t('massar.loading')} />}
            </div>
            <div hidden={view !== 'statements'}>
              {availability ? <MassarStatementEditor key={JSON.stringify(setup.subjects.map(subject => subject.name))} settings={availability.statement ?? null} setup={setup}
                open={view === 'statements'} /> : <MassarLoadingSkeleton label={t('massar.loading')} />}
            </div>
          </div>
        </div>}
    </div></main>
  </div>;
}
