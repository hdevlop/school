'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ComboboxInput, NajmScroll, NButton, SelectInput, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useNThemeBrandingSlot } from 'najm-theme/react';
import { MassarPaper } from '@/features/Massar/components/MassarPaper';
import { NOTES_MASSAR_API } from '../hooks/useMassarGrades';
import type { MassarPaperOptions } from '@/features/Massar/config/massarDocument';
import styles from '@/features/Massar/components/Massar.module.css';
import { GradeMarkField } from './GradeMarkField';

type SheetFilter = {
  name: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
};

/** One School exam drawn as a Massar sheet: its roster, and its marks as one column. */
export interface GradeExamSheetProps {
  title: string;
  total: number | null;
  /** Whose sheet it is: class and section, on the line above the grid. */
  meta: string;
  passRate: string | null;
  rows: any[];
  loading: boolean;
  allowFeedback: boolean;
  onEdit: (row: any, columnId: string, value: unknown) => void;
  onAbsent: (row: any) => void;
  onToggleStatus: (row: any) => void;
  failed: boolean;
  onRetry: () => void;
}

interface GradesSheetProps {
  filters: SheetFilter[];
  /** Massar's own grid for the chosen Contrôle: every part of the subject side by side, saved by Massar. */
  massarSheetId: string | null;
  /** One of School's exams, as one column. */
  exam: GradeExamSheetProps | null;
  /** Shown in place of a sheet: a choice still to make, or why there is nothing. */
  placeholder: ReactNode;
  /** Massar's grid has marks on their way: the filters wait, as Massar's own class and subject buttons do. */
  busy: boolean;
  onBusy: (busy: boolean) => void;
  /** Each student's Latin name, shown under Massar's Arabic one. */
  latinNames: ReadonlyMap<string, string>;
}

// Massar.module.css: N° 52 + code 132 + name 200, then 112 per mark (MassarPaper's IDENTITY_WIDTH and MARK_WIDTH).
const IDENTITY_WIDTH = 384, MARK_WIDTH = 112, FEEDBACK_WIDTH = 220;

/**
 * Grades on a desktop, as Massar draws them: right to left, numbered rows, the
 * Massar code and both names pinned while the marks scroll. A Massar Contrôle
 * opens Massar's full grid, every part side by side; one of School's exams gets
 * the same grid with its column. A phone keeps the roster list, part by part.
 */
export default function GradesSheet({ filters, massarSheetId, exam, placeholder, busy, onBusy, latinNames }: GradesSheetProps) {
  const { t, language } = useTranslation();
  const logo = useNThemeBrandingSlot('authLogo');
  const options = useMemo<MassarPaperOptions>(() => ({
    language, logo, title: t('massar.flow.paperTitle'), student: t('massar.student'),
    teacher: t('massar.teacher'), term: t('massar.term'), exam: t('massar.exam'),
  }), [language, logo, t]);

  return (
    <div className={cn(styles.page, 'flex-1')}>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {filters.filter(filter => typeof filter.onChange === 'function' && filter.type !== 'text').map(filter => (
          <div key={filter.name} className={cn('w-full shrink-0 sm:w-40 xl:w-56', filter.className)}>
            {filter.type === 'combobox' ? (
              <ComboboxInput
                value={filter.value ?? ''} onChange={filter.onChange!} items={filter.options ?? []}
                placeholder={filter.placeholder} searchPlaceholder={filter.searchPlaceholder} ariaLabel={filter.placeholder}
                showIcon={false} disabled={filter.disabled || busy} className="w-full"
              />
            ) : (
              <SelectInput
                value={filter.value ?? ''} onChange={filter.onChange!} items={filter.options ?? []}
                placeholder={filter.placeholder} ariaLabel={filter.placeholder}
                showIcon={false} disabled={filter.disabled || busy} className="w-full"
              />
            )}
          </div>
        ))}
      </div>
      {massarSheetId ? (
        <div className={cn(styles.sheetArea, 'flex-1')}>
          <div className={styles.sheetCard}>
            <MassarPaper key={massarSheetId} id={massarSheetId} options={options} onBusy={onBusy} latinNames={latinNames} api={NOTES_MASSAR_API} />
          </div>
        </div>
      ) : exam ? <GradeExamSheet {...exam} /> : placeholder}
    </div>
  );
}

function GradeExamSheet({ title, total, meta, passRate, rows, loading, allowFeedback, onEdit, onAbsent, onToggleStatus, failed, onRetry }: GradeExamSheetProps) {
  const { t } = useTranslation();
  const width = IDENTITY_WIDTH + MARK_WIDTH + (allowFeedback ? FEEDBACK_WIDTH : 0);
  return (
    <div className={cn(styles.sheetArea, 'flex-1')}>
      <div className={styles.sheetCard}>
        {/* The sheet reads right to left, as Massar does, whatever the interface language. */}
        <section className={styles.paper} dir="rtl" aria-label={title}>
          <div className={`${styles.paperMeta} ${styles.paperLine}`}>
            <span><bdi>{meta}</bdi> · <span dir="auto">{title}</span></span>
            {passRate ? <span className={styles.sheetTeacher} dir="auto">{t('grades.toolbar.passRate')} <bdi dir="ltr">{passRate}</bdi></span> : null}
          </div>
          {loading ? <p role="status" className={styles.sheetLoading}>{t('common.loading')}</p> : (
            <NajmScroll axis="both" autoHide="leave" className={styles.desktopSheet}>
              <table className={styles.paperTable} style={{ width }}>
                <colgroup>
                  <col className={styles.colNumber} /><col className={styles.colCode} /><col className={styles.colName} /><col className={styles.colMark} />
                  {allowFeedback ? <col style={{ width: FEEDBACK_WIDTH }} /> : null}
                </colgroup>
                <thead>
                  <tr>
                    <th className={styles.stickyNumber}><bdi dir="ltr">N°</bdi></th>
                    <th className={styles.stickyCode}>Code Massar</th>
                    <th className={styles.stickyName}>{t('massar.student')}</th>
                    <th dir="auto" title={title}>{title}{total != null ? <small dir="ltr">/ {Number(total)}</small> : null}</th>
                    {allowFeedback ? <th>{t('grades.table.feedback')}</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const absent = row.status === 'missed';
                    return (
                      <tr key={row.rowId}>
                        <td className={styles.stickyNumber}>{index + 1}</td>
                        <td className={styles.stickyCode} dir="ltr">{row.studentCode}</td>
                        {/* Both names: the Arabic one as Massar writes it, the Latin one under it. */}
                        <th scope="row" className={styles.stickyName} title={[row.studentArabicName, row.studentName].filter(Boolean).join(' · ')}>
                          {row.studentArabicName ? <bdi lang="ar" dir="rtl" className="block truncate font-normal">{row.studentArabicName}</bdi> : null}
                          <bdi dir="ltr" className={styles.latinName}>{row.studentName}</bdi>
                        </th>
                        <td>
                          <div className={styles.cellField} data-empty={!absent && (row.marksObtained == null || row.marksObtained === '')}>
                            {absent ? (
                              // Massar's justified absence: the cell says it, and a click gives the mark back.
                              <button
                                type="button" className={styles.markInput} disabled={!row.editable}
                                title={row.editable ? t('grades.status.pending') : undefined}
                                onClick={() => onToggleStatus(row)}
                              >
                                {t('grades.status.missed')}
                              </button>
                            ) : (
                              <GradeMarkField
                                value={row.marksObtained} total={row.totalMarks} disabled={!row.editable}
                                label={`${row.studentName} · ${title}`} inputClassName={styles.markInput}
                                onChange={(value) => onEdit(row, 'marksObtained', value)}
                                onAbsent={() => onAbsent(row)}
                              />
                            )}
                          </div>
                        </td>
                        {allowFeedback ? <td><FeedbackCell row={row} onEdit={onEdit} /></td> : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </NajmScroll>
          )}
        </section>
        {/* Marks save on their own, so only a failed save is said, with Retry, as on Massar's sheet. */}
        {failed ? (
          <div className={styles.saveBar} role="alert">
            <span>{t('grades.messages.autosaveFailed')}</span>
            <NButton size="sm" variant="outline" onClick={onRetry}>{t('grades.messages.retry')}</NButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** A remark kept in its own cell, sent when the cell is left. */
function FeedbackCell({ row, onEdit }: { row: any; onEdit: GradeExamSheetProps['onEdit'] }) {
  const { t } = useTranslation();
  const saved = row.feedback ?? '';
  const [text, setText] = useState(saved);
  useEffect(() => setText(saved), [saved]);
  return (
    <div className={styles.cellField}>
      <input
        type="text" dir="auto" autoComplete="off" className={styles.markInput} style={{ textAlign: 'start' }}
        value={text} disabled={!row.editable} aria-label={`${row.studentName} · ${t('grades.table.feedback')}`}
        onChange={event => setText(event.target.value)}
        onBlur={() => { if (text !== saved) onEdit(row, 'feedback', text); }}
      />
    </div>
  );
}
