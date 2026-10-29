'use client';

import { useId, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Plus } from 'lucide-react';
import { NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toOfficialClassName, type ExamPlanningClass, type ExamPlanningEntry } from '@sms/contracts';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import type { PlanningEntrySelection } from './examPlanningModel';
import styles from './ExamPlanning.module.css';

export function PlanningSchedule({ classes, entriesFor, selected, canEdit, saving, onSelect, onAdd }: {
  classes: ExamPlanningClass[]; entriesFor: (cls: ExamPlanningClass) => ExamPlanningEntry[];
  selected?: PlanningEntrySelection | null; canEdit: boolean; saving: boolean;
  onSelect: (value: PlanningEntrySelection) => void; onAdd: (cls: ExamPlanningClass) => void;
}) {
  const { t } = useTranslation();
  const { displayDate } = useSchoolFormat();
  const scheduleId = useId();
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  return <div className={styles.schedules}>{classes.map(cls => {
    const entries = [...entriesFor(cls)].sort((a, b) => a.date.localeCompare(b.date));
    const dates = [...new Set(entries.map(entry => entry.date))];
    const compact = dates.length > 0 && dates.every(date => collapsedDays[`${cls.id}:${date}`]);
    const compactLabel = t(compact ? 'examPlanning.expandDays' : 'examPlanning.compactDays');
    return <section key={cls.id} className={styles.scheduleGroup} aria-label={`${t('examPlanning.schedule')} ${toOfficialClassName(cls.name)}`}>
      <div className={styles.sectionTitle}>
        <div className={styles.sectionInfo}>
          <h2>{t('examPlanning.schedule')} · {toOfficialClassName(cls.name)}</h2>
          <span className={styles.secondary}>{t('examPlanning.dayCount', { count: dates.length })}</span>
        </div>
        <div className={styles.sectionTools}>
          {dates.length > 0 && <NButton type="button" variant="outline" size="sm" className={styles.scheduleAction} aria-pressed={compact} leftIcon={compact ? <ChevronsUpDown /> : <ChevronsDownUp />} onClick={() => setCollapsedDays(current => ({ ...current, ...Object.fromEntries(dates.map(date => [`${cls.id}:${date}`, !compact])) }))}>{compactLabel}</NButton>}
          {canEdit && <NButton type="button" variant="outline" size="sm" className={styles.scheduleAction} disabled={saving} onClick={() => onAdd(cls)} leftIcon={<Plus />}>{t('examPlanning.addEntry')}</NButton>}
        </div>
      </div>
      {!entries.length ? <p className={styles.empty}>{t('examPlanning.emptyDescription')}</p> : dates.map(date => {
        const dayEntries = entries.filter(entry => entry.date === date);
        const dayKey = `${cls.id}:${date}`;
        const contentId = `${scheduleId}-${cls.id}-${date}`;
        const collapsed = !!collapsedDays[dayKey];
        return <section key={date} className={styles.day}>
          <h3 className={styles.dayHeading}>
            <button type="button" className={styles.dayTitle} aria-expanded={!collapsed} aria-controls={contentId} onClick={() => setCollapsedDays(current => ({ ...current, [dayKey]: !current[dayKey] }))}>
              <span>{displayDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <span className={styles.dayTools}><span className={styles.secondary}>{t('examPlanning.subjectCount', { count: dayEntries.length })}</span><ChevronDown className={styles.dayChevron} aria-hidden="true" /></span>
            </button>
          </h3>
          <div id={contentId} hidden={collapsed}>
          {dayEntries.map(entry => <button key={entry.id} type="button" disabled={saving} className={styles.entry} aria-pressed={selected?.entryId === entry.id && selected?.classId === cls.id && selected.month === entry.date.slice(0, 7)} onClick={() => onSelect({ classId: cls.id, month: entry.date.slice(0, 7), entryId: entry.id })}>
            <span><span className={styles.entryLabel} lang={entry.language} dir="auto">{entry.subject}</span><span className={styles.entryTopic}>{t('examPlanning.lessonCount', { count: entry.lessons.filter(line => line.trim()).length })}</span></span>
            <ChevronRight className={styles.entryArrow} aria-hidden="true" />
          </button>)}
          </div>
        </section>;
      })}
    </section>;
  })}</div>;
}
