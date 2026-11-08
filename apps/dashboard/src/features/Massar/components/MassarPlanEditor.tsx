'use client';
import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { MASSAR_DEFAULT_PLAN, type MassarPlan, type MassarRound } from '@sms/contracts';
import { massarPut, useMassarAction } from '../hooks/useMassar';
import type { PlannedRound } from '../config/massarModel';
import styles from './Massar.module.css';

const shortDate = (date: string) => date.split('-').reverse().join('/');
const dayMonth = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/**
 * Réglages Massar → the year's Contrôles and the date marks are due for each.
 * Planning decides which Contrôles exist (each month of exams is one); here
 * the school only sets due dates. A Contrôle already opened keeps its own due
 * date, changed on the Massar page.
 */
export function MassarPlanEditor({ plan, planned, rounds }: { plan: MassarPlan | null; planned: PlannedRound[]; rounds: MassarRound[] }) {
  const { t } = useTranslation(), action = useMassarAction();
  const initial = plan ?? MASSAR_DEFAULT_PLAN;
  const [draft, setDraft] = useState<MassarPlan>(initial);
  const rows = planned.map(row => ({ ...row, dueDate: draft.dates.find(date => date.term === row.term && date.exam === row.exam)?.dueDate ?? null }));
  const opened = (row: { term: number; exam: number }) => rounds.find(round => round.term === row.term && round.exam === row.exam);
  const setDate = (row: { term: number; exam: number }, dueDate: string) => setDraft({ ...draft,
    dates: [...draft.dates.filter(date => date.term !== row.term || date.exam !== row.exam), ...(dueDate ? [{ term: row.term, exam: row.exam, dueDate }] : [])] });
  const kept = (value: MassarPlan) => ({ primary: value.primary, college: value.college,
    dates: value.dates.filter(date => date.dueDate && rows.some(row => row.term === date.term && row.exam === date.exam)).sort((a, b) => a.term - b.term || a.exam - b.exam) });
  const dirty = JSON.stringify(kept(draft)) !== JSON.stringify(kept(initial));
  const save = async () => { await action.run(() => massarPut('/plan', kept(draft))); };

  return <section className={styles.planPanel} aria-labelledby="massar-plan-title">
    <header className={styles.planHead}>
      <span><CalendarDays aria-hidden className={styles.blockIcon} /><strong id="massar-plan-title">{t('massar.flow.plan.title')}</strong> <span className={styles.subtle}>· {t('massar.flow.plan.help')}</span></span>
      <NButton size="sm" disabled={!dirty || action.pending} loading={action.pending} onClick={() => { void save(); }}>{t('massar.flow.plan.save')}</NButton>
    </header>
    {!rows.length && <p className={styles.subtle}>{t('massar.flow.planFirst')}</p>}
    <ul className={styles.planRows}>{rows.map(row => {
      const round = opened(row);
      return <li key={`${row.term}:${row.exam}`}>
        <span>{t('massar.flow.control', { term: row.term, exam: row.exam })}{row.examFrom && row.examTo && <span className={styles.subtle}> · {row.examFrom === row.examTo ? t('massar.flow.examDay', { date: dayMonth(row.examFrom) }) : t('massar.flow.examDates', { from: dayMonth(row.examFrom), to: dayMonth(row.examTo) })}</span>}</span>
        {round ? <span className={styles.subtle}>{t('massar.flow.plan.opened')}{round.dueDate ? ` · ${shortDate(round.dueDate)}` : ''}</span>
          : <input type="date" className={styles.input} aria-label={`${t('massar.flow.control', { term: row.term, exam: row.exam })} · ${t('massar.flow.dueLabel')}`}
            value={row.dueDate ?? ''} disabled={action.pending} onChange={event => setDate(row, event.target.value)} />}
      </li>;
    })}</ul>
  </section>;
}
