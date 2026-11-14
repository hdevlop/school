import type { useTranslation } from 'najm-i18n/react';

type Translate = ReturnType<typeof useTranslation>['t'];
type RoundKey = { term: number; exam: number };
/** What a Contrôle's second line can say: its due date for marks, else when Planning holds its exams. */
type Dated = { dueDate?: string | null; examFrom?: string | null; examTo?: string | null };

/** 2026-11-08 → 08/11/2026 */
const shortDate = (date: string) => date.split('-').reverse().join('/');
/** 2026-11-08 → 08/11 */
const dayMonth = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/**
 * How a Contrôle names itself in the picker: a full name and date line, and the short forms
 * the narrowed classes column shows (C1-S1 over the bare dates).
 */
export function controlLabels(t: Translate) {
  const label = (value: RoundKey) => value.exam === 4
    ? `${t('massar.flow.activities')} — ${t('massar.flow.semester', { term: value.term })}`
    : t('massar.flow.control', { term: value.term, exam: value.exam });

  const shortLabel = (value: RoundKey) => value.exam === 4
    ? t('massar.flow.activitiesShort', { term: value.term })
    : t('massar.flow.controlShort', { term: value.term, exam: value.exam });

  const when = (item: Dated) => {
    if (item.dueDate) return shortDate(item.dueDate);
    if (!item.examFrom || !item.examTo) return t('massar.flow.plan.noDate');
    return item.examFrom === item.examTo
      ? t('massar.flow.examDay', { date: dayMonth(item.examFrom) })
      : t('massar.flow.examDates', { from: dayMonth(item.examFrom), to: dayMonth(item.examTo) });
  };

  const shortWhen = (item: Dated) => {
    if (item.dueDate) return shortDate(item.dueDate);
    if (!item.examFrom || !item.examTo) return t('massar.flow.plan.noDate');
    return item.examFrom === item.examTo ? dayMonth(item.examFrom) : `${dayMonth(item.examFrom)} – ${dayMonth(item.examTo)}`;
  };

  return { label, shortLabel, when, shortWhen };
}

export type ControlLabels = ReturnType<typeof controlLabels>;
