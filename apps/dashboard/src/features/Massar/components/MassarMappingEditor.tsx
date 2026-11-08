'use client';

import { useState } from 'react';
import { Check, Save } from 'lucide-react';
import { NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { MassarMappings, MassarSetup } from '@sms/contracts';
import { classOrder } from '../config/massarModel';
import { MassarBadge, MassarSelect } from './MassarShared';
import styles from './Massar.module.css';

export function MassarMappingEditor({ setup, initial, submit, pending, commit, onBack }: {
  setup: MassarSetup; initial: MassarMappings; submit: (data: MassarMappings) => Promise<void>; pending: boolean; commit?: boolean; onBack?: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initial), [view, setView] = useState<'classes' | 'subjects'>('classes'), [level, setLevel] = useState('');
  const levels = [...new Set([...draft.classes.map(cls => cls.name.split('-')[0]), ...draft.subjects.map(subject => subject.level)])].sort(classOrder);
  const mapped = draft.classes.filter(cls => cls.classId && cls.sectionId).length + draft.subjects.filter(subject => subject.subjectId).length;
  const total = draft.classes.length + draft.subjects.length;
  const invalid = draft.classes.some(cls => !!cls.classId !== !!cls.sectionId);
  const status = (ready: boolean) => <MassarBadge status={ready ? 'ready' : 'warning'}>{t(ready ? 'massar.ui.mapped' : 'massar.unmapped')}</MassarBadge>;
  return <form className={styles.editor} onSubmit={event => { event.preventDefault(); void submit(draft); }}>
    <div className={styles.mappingTools}>
      <div className={styles.mappingTabs} role="group" aria-label={t('massar.mappings')}>
        <button type="button" aria-pressed={view === 'classes'} onClick={() => setView('classes')}>{t('massar.ui.classes')} ({draft.classes.length})</button>
        <button type="button" aria-pressed={view === 'subjects'} onClick={() => setView('subjects')}>{t('massar.ui.subjects')} ({draft.subjects.length})</button>
      </div>
      <MassarSelect ariaLabel={t('massar.ui.level')} value={level} onChange={setLevel} items={[{ value: '', label: t('massar.ui.allLevels') }, ...levels.map(value => ({ value, label: value }))]} />
    </div>
    <div className={styles.tableWrap}>
      {view === 'classes' ? <table className={`${styles.compactTable} ${styles.mappingTable}`}>
        <thead><tr><th scope="col">{t('massar.class')}</th><th scope="col">{t('massar.appClass')}</th><th scope="col">{t('massar.section')}</th><th scope="col">{t('massar.status')}</th></tr></thead>
        <tbody>{draft.classes.filter(cls => !level || cls.name.split('-')[0] === level).sort((a, b) => classOrder(a.name, b.name)).map(cls => <tr key={cls.name}>
          <td><bdi>{cls.name}</bdi></td>
          <td className={styles.controlCell}><MassarSelect ariaLabel={`${cls.name} · ${t('massar.appClass')}`} value={cls.classId ?? ''} disabled={pending} onChange={value => setDraft({ ...draft, classes: draft.classes.map(item => item.name === cls.name ? { ...item, classId: value || null, sectionId: null } : item) })} items={[{ value: '', label: t('massar.unmapped') }, ...setup.appClasses.map(app => ({ value: app.id, label: app.name }))]} /></td>
          <td className={styles.sectionCell}><MassarSelect ariaLabel={`${cls.name} · ${t('massar.section')}`} value={cls.sectionId ?? ''} disabled={pending || !cls.classId} onChange={value => setDraft({ ...draft, classes: draft.classes.map(item => item.name === cls.name ? { ...item, sectionId: value || null } : item) })} items={[{ value: '', label: t('massar.select') }, ...setup.appSections.filter(section => section.classId === cls.classId).map(section => ({ value: section.id, label: section.name }))]} /></td>
          <td>{status(!!cls.classId && !!cls.sectionId)}</td>
        </tr>)}</tbody>
      </table> : <table className={`${styles.compactTable} ${styles.mappingTable}`}>
        <thead><tr><th scope="col">{t('massar.ui.level')}</th><th scope="col">{t('massar.subject')}</th><th scope="col">{t('massar.ui.schoolSubject')}</th><th scope="col">{t('massar.status')}</th></tr></thead>
        <tbody>{draft.subjects.filter(subject => !level || subject.level === level).sort((a, b) => classOrder(a.level, b.level) || classOrder(a.code, b.code)).map(subject => {
          const saved = setup.subjects.find(item => item.code === subject.code && setup.levels.find(known => known.id === item.levelId)?.code === subject.level);
          const name = 'name' in subject ? String(subject.name) : saved?.name;
          return <tr key={`${subject.level}:${subject.code}`}><td><bdi>{subject.level}</bdi></td><td><span dir="auto">{name || subject.code}</span>{saved?.confirmed === false && <span className={styles.toConfirmChip} title={t('massar.flow.toConfirmHelp')}>⚠ {t('massar.flow.toConfirm')}</span>}<div className={styles.code}>{subject.code}</div></td>
            <td className={styles.controlCell}><MassarSelect ariaLabel={`${subject.level} · ${name || subject.code} · ${t('massar.ui.schoolSubject')}`} value={subject.subjectId ?? ''} disabled={pending} onChange={value => setDraft({ ...draft, subjects: draft.subjects.map(item => item.level === subject.level && item.code === subject.code ? { ...item, subjectId: value || null } : item) })} items={[{ value: '', label: t('massar.unmapped') }, ...setup.appSubjects.map(app => ({ value: app.id, label: app.name }))]} /></td><td>{status(!!subject.subjectId)}</td></tr>;
        })}</tbody>
      </table>}
    </div>
    <div className={styles.footer}>
      <p>{t('massar.ui.mappingCount', { count: mapped, total })}{invalid && <span role="alert"> · {t('massar.errors.invalidMapping')}</span>}</p>
      <div className={styles.actions}>{onBack && <NButton type="button" variant="outline" disabled={pending} onClick={onBack}>{t('massar.ui.back')}</NButton>}<NButton type="submit" leftIcon={commit ? Check : Save} loading={pending} disabled={pending || invalid}>{t(commit ? 'massar.confirmImport' : 'massar.saveMappings')}</NButton></div>
    </div>
  </form>;
}
