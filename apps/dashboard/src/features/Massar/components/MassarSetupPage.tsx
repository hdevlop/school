'use client';
import { useRouter } from 'next/navigation';
import { NButton, NEmptyState } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { MassarPlan, MassarRound, MassarSetup } from '@sms/contracts';
import { ViewingYearSelector } from '@/features/AcademicYears/components/ViewingYearSelector';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { massarPut, useMassarAction, useMassarRead } from '../hooks/useMassar';
import { MassarMappingEditor } from './MassarMappingEditor';
import { MassarPlanEditor } from './MassarPlanEditor';
import type { PlannedRound } from '../config/massarModel';
import { MassarHeader, MassarLoadError, MassarLoadingSkeleton } from './MassarShared';
import styles from './Massar.module.css';

/**
 * Académique → Réglages Massar: which School class, section and subject each
 * Massar class and subject stands for. The import makes these links; this page
 * only corrects a wrong one.
 */
export function MassarSettingsPage() {
  const { t } = useTranslation(), action = useMassarAction(), router = useRouter();
  const { data: setup, error, isLoading, refetch } = useMassarRead<MassarSetup>('/setup', true);
  const { data: availability } = useMassarRead<{ plan?: MassarPlan | null; planned?: PlannedRound[] }>('/availability', true), { data: rounds } = useMassarRead<MassarRound[]>('/rounds', true);
  const kinds = [...new Set((setup?.levels ?? []).flatMap(level => level.kind ? [level.kind] : []))].sort();
  const total = setup ? setup.classes.length + setup.subjects.length : 0;
  return <div className={styles.page} data-massar-page="settings">
    <MassarHeader title={t('massar.flow.settings')} subtitle={setup && total ? t('massar.flow.settingsHelp') : undefined} actions={<div className={styles.actions}><ViewingYearSelector placement="header" /></div>} />
    <main className={styles.scroll}><div className={styles.main}>
      {error ? <MassarLoadError error={error} retry={() => refetch()} /> : isLoading || !setup ? <MassarLoadingSkeleton label={t('massar.loading')} />
        : !total ? <div className={styles.emptyWrap}><NEmptyState surface="panel" icon={FEATURE_ICONS.massar} title={t('massar.flow.noFiles')} description={t('massar.flow.settingsEmpty')}
          action={<NButton onClick={() => router.push('/massar')}>{t('massar.flow.goToMassar')}</NButton>} /></div>
        : <div className={styles.settingsPanel}>
          <MassarMappingEditor key={JSON.stringify([setup.classes, setup.subjects])} setup={setup} pending={action.pending}
            initial={{ classes: setup.classes.map(cls => ({ name: cls.name, classId: cls.classId, sectionId: cls.sectionId })), subjects: setup.subjects.map(subject => ({ level: setup.levels.find(level => level.id === subject.levelId)?.code ?? '', code: subject.code, subjectId: subject.subjectId })) }}
            submit={async mappings => { await action.run(() => massarPut('/mappings', mappings)); }} />
        </div>}
      {setup && !error && total > 0 && kinds.length > 0 && availability && rounds && <MassarPlanEditor key={JSON.stringify(availability.plan ?? null)} plan={availability.plan ?? null} planned={availability.planned ?? []} rounds={rounds} />}
    </div></main>
  </div>;
}
