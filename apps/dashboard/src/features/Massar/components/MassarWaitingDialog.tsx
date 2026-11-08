'use client';
import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { NButton, NDialog } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { canEditStudentPlacement } from '@sms/contracts/access-control';
import type { MassarPendingStudent, MassarSetup } from '@sms/contracts';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { massarPost, useMassarAction } from '../hooks/useMassar';
import styles from './Massar.module.css';

type Addition = 'M' | 'F' | 'skip';
const displayDate = (date?: string) => date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('/') : date ?? '';

/**
 * A class that waits for students: the same choices as the import check, here.
 * "Same" gives the School student its code, class, birth date and Arabic name
 * from Massar; the class gets its sheets once nobody is missing.
 */
export function MassarWaitingDialog({ cls, close, addFiles }: { cls: MassarSetup['classes'][number]; close: () => void; addFiles: () => void }) {
  const { t } = useTranslation(), action = useMassarAction(), viewer = useViewerRole();
  const [same, setSame] = useState<Record<string, boolean>>({}), [added, setAdded] = useState<Record<string, Addition>>({});
  const pending: MassarPendingStudent[] = cls.pendingStudents ?? [];
  const legacy = cls.unmatchedCodes.some(code => !pending.some(student => student.studentCode === code));
  const canDecide = viewer.can('update:students') && canEditStudentPlacement(viewer.role), canAdd = viewer.can('create:students');
  const asMatch = (student: MassarPendingStudent) => !!student.suggestion && same[student.studentCode] !== false;
  const matches = pending.filter(student => asMatch(student) && same[student.studentCode] === true).map(student => ({ studentCode: student.studentCode, studentId: student.suggestion!.studentId }));
  const additions = pending.filter(student => !asMatch(student)).flatMap(student => { const gender = added[student.studentCode]; return gender === 'M' || gender === 'F' ? [{ studentCode: student.studentCode, gender }] : []; });
  const answered = matches.length + additions.length > 0;
  const save = async () => {
    await action.run(() => massarPost('/students/resolve', { massarClassId: cls.id, matches, additions }));
    toast.success(t('massar.success.saved')); close();
  };
  const recheck = async () => { await action.run(() => massarPost('/students/recheck')); close(); };

  return <NDialog open onOpenChange={open => { if (!open && !action.pending) close(); }} title={cls.name} size="lg" showButtons={false}><div className={styles.dialogBody}>
    <p>{t('massar.flow.waitingHelp')}</p>
    {pending.length > 0 && <div className={styles.decisionBlock}>{pending.map(student => {
      const suggestion = student.suggestion, choice = same[student.studentCode], gender = added[student.studentCode];
      return <div className={styles.decisionRow} key={student.studentCode}>
        <bdi className={styles.classTag}>{student.studentCode}</bdi>
        {asMatch(student) ? <div className={styles.decisionText}>
          <div className={styles.decisionNames}>
            <bdi dir="auto" title={`${t('massar.flow.massarSide')} · ${displayDate(student.dateOfBirth)}`}>{student.name}</bdi>
            <ArrowLeftRight aria-hidden className={styles.matchArrow} />
            <bdi dir="auto" title={`${t('massar.flow.schoolSide')} · ${suggestion!.studentCode}`}>{suggestion!.name}</bdi>
          </div>
          <small className={suggestion!.strong ? styles.reasonStrong : styles.subtle}>{suggestion!.reasons.map(reason => t(`massar.flow.reason.${reason}`)).join(' · ')}</small>
        </div> : <div className={styles.decisionText}><bdi dir="auto">{student.name}</bdi><small className={styles.subtle}>{displayDate(student.dateOfBirth)}</small></div>}
        {asMatch(student) ? canDecide && <div className={styles.segmented} role="group" aria-label={t('massar.flow.matchesTitle')}>
          <button type="button" aria-pressed={choice === true} data-tone="ok" disabled={action.pending} onClick={() => setSame({ ...same, [student.studentCode]: true })}>{choice === true ? '✓ ' : ''}{t('massar.flow.same')}</button>
          <button type="button" aria-pressed={choice === false} disabled={action.pending} onClick={() => setSame({ ...same, [student.studentCode]: false })}>{t('massar.flow.different')}</button>
        </div> : canAdd && <div className={styles.segmented} role="group" aria-label={t('massar.flow.newTitle')}>
          {(['M', 'F', 'skip'] as const).map(value => <button key={value} type="button" aria-pressed={gender === value} data-tone={value === 'skip' ? undefined : 'ok'} disabled={action.pending} onClick={() => setAdded({ ...added, [student.studentCode]: value })}>
            {t(value === 'M' ? 'massar.flow.addBoy' : value === 'F' ? 'massar.flow.addGirl' : 'massar.flow.skip')}</button>)}
        </div>}
      </div>;
    })}</div>}
    {legacy && <p className={styles.notice}>{t('massar.flow.legacyWaiting')}</p>}
  </div><div className={styles.dialogFooter}>
    <NButton variant="outline" disabled={action.pending} onClick={close}>{t('massar.cancel')}</NButton>
    {legacy ? <NButton disabled={action.pending} onClick={addFiles}>{t('massar.flow.addFiles')}</NButton>
      : answered ? <NButton disabled={action.pending} loading={action.pending} onClick={() => { void save(); }}>{t('massar.flow.saveAnswers')}</NButton>
        : <NButton variant="outline" disabled={action.pending} loading={action.pending} onClick={() => { void recheck(); }}>{t('massar.flow.recheck')}</NButton>}
  </div></NDialog>;
}
