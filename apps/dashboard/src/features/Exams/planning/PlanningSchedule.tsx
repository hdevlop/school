'use client';

import { useId, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Plus, Trash2 } from 'lucide-react';
import { NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toOfficialClassName, type ExamPlanningClass, type ExamPlanningEntry } from '@sms/contracts';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { planningTextLanguage, type PlanningEntrySelection } from './examPlanningModel';
import styles from './ExamPlanning.module.css';

export function PlanningSchedule({ classes, entriesFor, emptyText, toPlaceTitle, plain = false, selected, saving, canAdd, canChange, onSelect, onAdd, onDelete }: {
  classes: ExamPlanningClass[]; entriesFor: (cls: ExamPlanningClass) => ExamPlanningEntry[];
  /** What an empty class says instead of the default, e.g. when only the teacher's own subjects are listed. */
  emptyText?: (cls: ExamPlanningClass) => string | undefined;
  /** The heading of the exams still without a day: the school's "to place", a teacher's "day set by the school". */
  toPlaceTitle?: string;
  /** Phones and teachers: no "Programme · class" heading or collapse button, the class being named above. */
  plain?: boolean;
  selected?: PlanningEntrySelection | null; saving: boolean;
  /** A teacher adds to and removes from only the subjects they teach in the class. */
  canAdd: (cls: ExamPlanningClass) => boolean; canChange: (cls: ExamPlanningClass, entry: ExamPlanningEntry) => boolean;
  onSelect: (value: PlanningEntrySelection) => void; onAdd: (cls: ExamPlanningClass) => void;
  onDelete: (cls: ExamPlanningClass, entry: ExamPlanningEntry) => void;
}) {
  const { t } = useTranslation();
  const { displayDate } = useSchoolFormat();
  const scheduleId = useId();
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  return <div className={styles.schedules}>{classes.map(cls => {
    const entries = [...entriesFor(cls)].sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? ''));
    // A teacher's exams the school has yet to give a day come first, apart from the days.
    const toPlace = entries.filter(entry => entry.toPlace);
    const dates = [...new Set(entries.filter(entry => !entry.toPlace).map(entry => entry.date))];
    const groups = [...(toPlace.length ? [{ key: 'to-place', entries: toPlace }] : []), ...dates.map(date => ({ key: date, entries: entries.filter(entry => !entry.toPlace && entry.date === date) }))];
    const compact = groups.length > 0 && groups.every(group => collapsedDays[`${cls.id}:${group.key}`]);
    const compactLabel = t(compact ? 'examPlanning.expandDays' : 'examPlanning.compactDays');
    return <section key={cls.id} className={styles.scheduleGroup} aria-label={`${t('examPlanning.schedule')} ${toOfficialClassName(cls.name)}`}>
      {(!plain || canAdd(cls)) && <div className={styles.sectionTitle}>
        {!plain && <div className={styles.sectionInfo}>
          <h2>{t('examPlanning.schedule')} · {toOfficialClassName(cls.name)}</h2>
          <span className={styles.secondary}>{t('examPlanning.dayCount', { count: dates.length })}</span>
        </div>}
        <div className={styles.sectionTools}>
          {!plain && groups.length > 0 && <NButton type="button" variant="outline" size="sm" className={styles.scheduleAction} aria-pressed={compact} leftIcon={compact ? <ChevronsUpDown /> : <ChevronsDownUp />} aria-label={compactLabel} title={compactLabel} onClick={() => setCollapsedDays(current => ({ ...current, ...Object.fromEntries(groups.map(group => [`${cls.id}:${group.key}`, !compact])) }))}><span className={styles.toolLabel}>{compactLabel}</span></NButton>}
          {canAdd(cls) && <NButton type="button" variant="outline" size="sm" className={styles.scheduleAction} disabled={saving} onClick={() => onAdd(cls)} leftIcon={<Plus />}>{t('examPlanning.addEntry')}</NButton>}
        </div>
      </div>}
      {!entries.length ? <p className={styles.empty}>{emptyText?.(cls) ?? t('examPlanning.emptyTitle')}</p> : groups.map(({ key, entries: dayEntries }) => {
        const dayKey = `${cls.id}:${key}`;
        const contentId = `${scheduleId}-${cls.id}-${key}`;
        const collapsed = !!collapsedDays[dayKey];
        const waiting = key === 'to-place';
        return <section key={key} className={styles.day} data-to-place={waiting || undefined}>
          <h3 className={styles.dayHeading}>
            <button type="button" className={styles.dayTitle} aria-expanded={!collapsed} aria-controls={contentId} onClick={() => setCollapsedDays(current => ({ ...current, [dayKey]: !current[dayKey] }))}>
              <span>{waiting ? toPlaceTitle ?? t('examPlanning.toPlace') : displayDate(key, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <span className={styles.dayTools}><span className={styles.secondary}>{t('examPlanning.subjectCount', { count: dayEntries.length })}</span><ChevronDown className={styles.dayChevron} aria-hidden="true" /></span>
            </button>
          </h3>
          <div id={contentId} hidden={collapsed}>
          {dayEntries.map(entry => {
            const isSelected = selected?.entryId === entry.id && selected?.classId === cls.id && selected.month === entry.date.slice(0, 7);
            const name = entry.subject || t('examPlanning.newEntry');
            // The row opens the exam; its trash button removes it (saved with the month, like any change).
            return <div key={entry.id} className={styles.entryRow} data-selected={isSelected}>
              <button type="button" disabled={saving} className={styles.entry} aria-pressed={isSelected} onClick={() => onSelect({ classId: cls.id, month: entry.date.slice(0, 7), entryId: entry.id })}>
                <span><span className={styles.entryLabel} lang={planningTextLanguage(entry.subject)} dir="auto">{name}</span><span className={styles.entryTopic}>{entry.startTime && entry.endTime && <><span className={styles.entryTime}>{entry.startTime} – {entry.endTime}</span> · </>}{t('examPlanning.lessonCount', { count: entry.lessons.filter(line => line.trim()).length })}</span></span>
                <ChevronRight className={styles.entryArrow} aria-hidden="true" />
              </button>
              {canChange(cls, entry) && <button type="button" disabled={saving} className={styles.entryDelete} aria-label={`${t('common.delete')} · ${name}`} title={t('common.delete')} onClick={() => onDelete(cls, entry)}><Trash2 aria-hidden="true" /></button>}
            </div>;
          })}
          </div>
        </section>;
      })}
    </section>;
  })}</div>;
}
