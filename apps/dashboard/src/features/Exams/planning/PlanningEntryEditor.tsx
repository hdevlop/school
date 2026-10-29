'use client';

import { CalendarDays, Check, FileText, Trash2 } from 'lucide-react';
import { DateInput, NButton, SelectInput, TextInput } from 'najm-kit';
import { parseISO } from 'date-fns';
import { useTranslation } from 'najm-i18n/react';
import { REVISION_LANGUAGES, type ExamPlanningEntry, type RevisionLanguage } from '@sms/contracts';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { planningMonthRange } from './examPlanningModel';
import styles from './ExamPlanning.module.css';

export function PlanningEntryEditor({ entry, className, month, disabled, canEdit, dirty, valid, onChange, onDelete, onCancel, onApply }: {
  entry: ExamPlanningEntry; className: string; month: string; disabled: boolean; canEdit: boolean; dirty: boolean; valid: boolean;
  onChange: (patch: Partial<ExamPlanningEntry>) => void; onDelete: () => void; onCancel: () => void; onApply: () => void;
}) {
  const { t } = useTranslation();
  const { displayDate } = useSchoolFormat();
  const dateRange = planningMonthRange(month);
  const headerDate = `${displayDate(entry.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${className}`;
  return <aside className={styles.editPanel} aria-label={t('examPlanning.editLessons')}>
    <div className={styles.editHeading}>
      <p className={styles.editDate} title={headerDate}><CalendarDays aria-hidden="true" /><span>{headerDate}</span></p>
      <h3 className={styles.editSubject} lang={entry.language} dir="auto" title={entry.subject}>{entry.subject}</h3>
    </div>
    <label className={styles.fieldLabel} htmlFor="planning-lessons">{t('assessmentPlanning.lessons')}{!entry.language.startsWith('ar') && <span lang="ar" dir="rtl">· الدروس المستهدفة</span>}</label>
    <textarea className={styles.lessonsInput} id="planning-lessons" readOnly={!canEdit} disabled={disabled} dir={entry.language === 'ar' ? 'rtl' : 'ltr'} lang={entry.language} value={entry.lessons.join('\n')} onChange={event => onChange({ lessons: event.target.value.split('\n') })} />
    <p className={styles.fieldNote}>{t('examPlanning.oneLessonPerLine')}</p>
    {canEdit && <div className={styles.details}>
      <div className={styles.detailFields}>
        <div><label className={styles.fieldLabel} htmlFor="planning-subject">{t('assessments.form.subject')}</label><TextInput id="planning-subject" maxLength={120} disabled={disabled} value={entry.subject} onChange={value => onChange({ subject: value })} /></div>
        <div><span className={styles.fieldLabel}>{t('assessmentPlanning.language')}</span><SelectInput ariaLabel={t('assessmentPlanning.language')} disabled={disabled} value={entry.language} onChange={value => onChange({ language: value as RevisionLanguage })} items={REVISION_LANGUAGES.map(value => ({ value, label: t(`examPlanning.languages.${value}`) }))} /></div>
        <div className={styles.detailDate}><span className={styles.fieldLabel}>{t('assessments.form.date')}</span><fieldset className="m-0 min-w-0 border-0 p-0" disabled={disabled}><DateInput ariaLabel={t('assessments.form.date')} value={entry.date ? parseISO(entry.date) : undefined} min={dateRange.from} max={dateRange.to} onChange={value => { if (value) onChange({ date: value }); }} /></fieldset></div>
      </div>
    </div>}
    <div className={styles.editorActions}>
      {canEdit && <NButton variant="outline" className={styles.deleteButton} type="button" disabled={disabled} onClick={onDelete}><Trash2 aria-hidden="true" />{t('common.delete')}</NButton>}
      {dirty && <NButton variant="outline" type="button" disabled={disabled} onClick={onCancel}>{t('common.cancel')}</NButton>}
      <NButton className={styles.applyButton} type="button" disabled={disabled || !valid} loading={disabled} onClick={onApply} leftIcon={canEdit && dirty ? <Check /> : <FileText />}>{t(canEdit && dirty ? 'examPlanning.saveAndPreview' : 'assessmentPlanning.previewTab')}</NButton>
    </div>
    {dirty && <p className={styles.editorStatus} role="status">{t('examPlanning.unsaved')}</p>}
  </aside>;
}
