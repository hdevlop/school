'use client';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolToday } from '@/hooks/useSchoolFormat';
import { dueState } from '../config/massarModel';
import styles from './Massar.module.css';

export function MassarDueNotice({ dueDate }: { dueDate?: string | null }) {
  const { t, language } = useTranslation(), today = useSchoolToday(), state = dueState(dueDate, today);
  if (!dueDate) return null;
  const date = new Intl.DateTimeFormat(language, { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(`${dueDate}T12:00:00Z`));
  return <p className={styles.notice} data-tone={state.status === 'late' ? 'error' : state.status === 'today' ? 'warning' : undefined} role="status">{t(`massar.flow.due.${state.status}`, { date, count: state.days })}</p>;
}
