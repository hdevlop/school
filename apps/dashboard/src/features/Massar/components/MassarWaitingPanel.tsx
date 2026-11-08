'use client';
import { UserRoundX, Wrench } from 'lucide-react';
import { NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { MassarSetup } from '@sms/contracts';
import styles from './Massar.module.css';

const displayDate = (date?: string) => date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('/') : date ?? '';

/** A class whose sheets wait for students Massar lists but School does not know yet. */
export function MassarWaitingPanel({ className, count, cls, fix }: { className: string; count: number; cls?: MassarSetup['classes'][number]; fix?: () => void }) {
  const { t } = useTranslation();
  const pending = cls?.pendingStudents ?? [];
  const legacy = cls?.unmatchedCodes.filter(code => !pending.some(student => student.studentCode === code)) ?? [];
  return <section className={styles.waitingPanel} aria-labelledby="massar-waiting-title">
    <header className={styles.waitingHead}>
      <span className={styles.waitingIcon} aria-hidden><UserRoundX /></span>
      <div className={styles.waitingText}>
        <h2 id="massar-waiting-title"><bdi>{className}</bdi><span className={styles.waitingPill}>{t('massar.flow.waiting', { count })}</span></h2>
        <p>{t('massar.flow.waitingHelp')}</p>
      </div>
      {fix && <NButton leftIcon={Wrench} onClick={fix}>{t('massar.flow.fix')}</NButton>}
    </header>
    {(pending.length > 0 || legacy.length > 0) && <ul className={styles.waitingList}>
      {pending.map(student => <li key={student.studentCode}>
        <span className={styles.waitingAvatar} aria-hidden>{student.name.trim().charAt(0)}</span>
        <span className={styles.waitingStudent}><bdi dir="auto">{student.name}</bdi><small><bdi>{student.studentCode}</bdi>{student.dateOfBirth ? ` · ${displayDate(student.dateOfBirth)}` : ''}</small></span>
      </li>)}
      {legacy.map(code => <li key={code}><span className={styles.waitingAvatar} aria-hidden>?</span><span className={styles.waitingStudent}><bdi>{code}</bdi></span></li>)}
    </ul>}
  </section>;
}
