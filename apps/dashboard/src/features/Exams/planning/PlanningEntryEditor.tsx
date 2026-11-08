'use client';

import { CalendarDays, Check } from 'lucide-react';
import { ComboboxInput, DateInput, NButton, Textarea, TimeRangeInput } from 'najm-kit';
import { parseISO } from 'date-fns';
import { useTranslation } from 'najm-i18n/react';
import { PLANNING_DEFAULT_DURATION, type ExamPlanningEntry } from '@sms/contracts';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { planningMonthRange, planningTextLanguage } from './examPlanningModel';
import { planningSubjectPicker } from './PlanningSubjects';
import styles from './ExamPlanning.module.css';

export function PlanningEntryEditor({ entry, subjects, className, month, disabled, dirty, valid, onChange, onCancel, onSave }: {
  entry: ExamPlanningEntry; subjects: Parameters<typeof planningSubjectPicker>[0]; className: string; month: string; disabled: boolean; dirty: boolean; valid: boolean;
  onChange: (patch: Partial<ExamPlanningEntry>) => void; onCancel: () => void; onSave: () => void;
}) {
  const { t } = useTranslation();
  const { displayDate } = useSchoolFormat();
  const dateRange = planningMonthRange(month);
  const headerDate = `${displayDate(entry.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${className}`;
  const lessonsLanguage = planningTextLanguage(entry.lessons);
  // Picked from Subjects: a subject, then one of its sub-subjects (off when it has none).
  const picker = planningSubjectPicker(subjects, entry.subject, { notInSubjects: t('examPlanning.notInSubjects'), wholeSubject: t('examPlanning.wholeSubject') });
  return <aside className={styles.editPanel} aria-label={t('examPlanning.editLessons')}>
    <div className={styles.editHeading}>
      <p className={styles.editDate} title={headerDate}><CalendarDays aria-hidden="true" /><span>{headerDate}</span></p>
      <h3 className={styles.editSubject} lang={planningTextLanguage(entry.subject)} dir="auto" title={entry.subject}>{entry.subject || t('examPlanning.newEntry')}</h3>
    </div>
    {/* What and when first, then the lessons. */}
    <div className={styles.details}>
      <div className={styles.detailFields}>
        <div><span className={styles.fieldLabel}>{t('assessments.form.subject')}</span><ComboboxInput ariaLabel={t('assessments.form.subject')} placeholder={t('examPlanning.chooseSubject')} disabled={disabled} items={picker.subjectItems} value={picker.subjectValue} onChange={value => { const name = picker.subjectName(value); if (name) onChange({ subject: name }); }} showIcon={false} className="w-full" /></div>
        <div><span className={styles.fieldLabel}>{t('examPlanning.subSubject')}</span><ComboboxInput ariaLabel={t('examPlanning.subSubject')} placeholder={t(picker.subjectValue && !picker.partItems.length ? 'examPlanning.noSubSubjects' : 'examPlanning.chooseSubSubject')} disabled={disabled || !picker.partItems.length} items={picker.partItems} value={picker.partValue} onChange={value => { const name = picker.partName(value); if (name) onChange({ subject: name }); }} showIcon={false} className="w-full" /></div>
        <div><span className={styles.fieldLabel}>{t('assessments.form.date')}</span><fieldset className="m-0 min-w-0 border-0 p-0" disabled={disabled}><DateInput ariaLabel={t('assessments.form.date')} value={entry.date ? parseISO(entry.date) : undefined} min={dateRange.from} max={dateRange.to} onChange={value => { if (value) onChange({ date: value }); }} /></fieldset></div>
        {/* One field, from and to: a new start keeps a later end or ends an hour after. */}
        <div><span className={styles.fieldLabel}>{t('examPlanning.time')}</span><TimeRangeInput ariaLabel={t('examPlanning.time')} disabled={disabled} defaultDuration={PLANNING_DEFAULT_DURATION} value={{ from: entry.startTime, to: entry.endTime }}
          onChange={range => onChange({ startTime: range.from, endTime: range.to })} /></div>
      </div>
    </div>
    <label className={styles.fieldLabel} htmlFor="planning-lessons">{t('assessmentPlanning.lessons')}{lessonsLanguage !== 'ar' && <span lang="ar" dir="rtl">· الدروس المستهدفة</span>}<span className={styles.labelNote}>· {t('examPlanning.oneLessonPerLine')}</span></label>
    <Textarea className={styles.lessonsInput} id="planning-lessons" disabled={disabled} dir="auto" lang={lessonsLanguage} value={entry.lessons.join('\n')} onChange={event => onChange({ lessons: event.target.value.split('\n') })} />
    {/* Only a change needs a button; the A4 preview has its own tab. */}
    {dirty && <div className={styles.editorActions}>
      <NButton variant="outline" type="button" disabled={disabled} onClick={onCancel}>{t('common.cancel')}</NButton>
      <NButton className={styles.applyButton} type="button" disabled={disabled || !valid} loading={disabled} onClick={onSave} leftIcon={<Check />}>{t('common.save')}</NButton>
    </div>}
    {dirty && <p className={styles.editorStatus} role="status">{t('examPlanning.unsaved')}</p>}
  </aside>;
}
