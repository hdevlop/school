'use client';

import { useEffect, useState } from 'react';
import { Eraser, MessageSquare, MessageSquarePlus, UserCheck, UserX } from 'lucide-react';
import { NButton, NSheet, Textarea, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { MASSAR_REMARK_MAX_LENGTH } from '@sms/contracts';
import { REMARKS, remarkBand, type RemarkLanguage } from '@/features/Massar/config/statementRemarks';

/** The few wordings offered as one tap, from the mark's band (ممتاز … ضعيف), as the statements write them. */
const SUGGESTIONS = 4;

interface Props {
  /** The student whose menu is open; null when closed. */
  row: any | null;
  onClose: () => void;
  /** The student's remark as stored (a Massar grid's remark, or an exam grade's feedback). */
  remark: string;
  /** Remarks can be written: the grid or exam is open to this user. */
  canRemark: boolean;
  savingRemark: boolean;
  onToggleAbsent: (row: any) => void;
  onClearMark: (row: any) => void;
  /** Resolves once saved; an empty remark removes it. */
  onSaveRemark: (row: any, remark: string) => Promise<void>;
}

/**
 * What a long press or a double tap on a student offers on a phone: mark them
 * absent (or undo it), clear their mark, and write the teacher's remark
 * (ملاحظة) that School's reports print for the subject.
 */
export default function GradeStudentMenu({ row, onClose, remark, canRemark, savingRemark, onToggleAbsent, onClearMark, onSaveRemark }: Props) {
  const { t, language } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const studentId = row?.studentId;
  useEffect(() => { setEditing(false); setText(remark); }, [studentId, remark]);

  const status = row?.status || 'pending';
  const hasMark = row?.marksObtained != null && row?.marksObtained !== '';
  const editable = !!row?.editable;
  const remarkLanguage: RemarkLanguage = language === 'ar' || language === 'en' ? language : 'fr';
  const band = hasMark ? remarkBand(Number(row.marksObtained), Number(row.totalMarks)) : null;
  const suggestions = band === null ? [] : REMARKS[remarkLanguage][band].slice(0, SUGGESTIONS);
  const trimmed = text.trim();

  const run = (action: (row: any) => void) => { action(row); onClose(); };
  const save = async (value: string) => {
    await onSaveRemark(row, value);
    onClose();
  };

  const item = 'h-12 w-full justify-start gap-3 px-3 text-sm font-medium';
  return (
    <NSheet
      open={!!row}
      onOpenChange={(open) => { if (!open) onClose(); }}
      side="bottom"
      // A phone's action sheet: across the screen, as tall as its content, rounded at the top.
      width={560}
      classNames={{ content: 'mx-auto h-auto max-h-[85dvh] rounded-t-2xl' }}
      icon={editing ? MessageSquare : UserCheck}
      title={row?.studentName ?? ''}
      description={row?.studentArabicName ? <bdi lang="ar" dir="rtl">{row.studentArabicName}</bdi> : undefined}
      footer={editing ? (
        <div className="flex w-full items-center gap-2">
          {remark ? (
            <NButton type="button" variant="ghost" className="text-destructive" disabled={savingRemark} onClick={() => { void save(''); }}>
              {t('common.delete')}
            </NButton>
          ) : null}
          <NButton type="button" variant="outline" className="ms-auto" disabled={savingRemark} onClick={() => setEditing(false)}>
            {t('common.cancel')}
          </NButton>
          <NButton type="button" loading={savingRemark} disabled={savingRemark || trimmed === remark.trim()} onClick={() => { void save(trimmed); }}>
            {t('common.save')}
          </NButton>
        </div>
      ) : undefined}
    >
      {editing ? (
        <div className="flex flex-col gap-3">
          <Textarea
            value={text}
            autoFocus
            dir="auto"
            rows={3}
            maxLength={MASSAR_REMARK_MAX_LENGTH}
            placeholder={t('grades.studentMenu.remarkPlaceholder')}
            aria-label={t('grades.studentMenu.remark')}
            onChange={(event) => setText(event.target.value)}
            className="text-base"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{suggestions.length ? t('grades.studentMenu.suggestions') : null}</span>
            <span className="tabular-nums">{text.length}/{MASSAR_REMARK_MAX_LENGTH}</span>
          </div>
          {suggestions.length ? (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((wording) => (
                <button
                  key={wording} type="button" dir="auto"
                  className={cn('rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-accent', trimmed === wording && 'border-primary bg-primary/10 text-primary')}
                  onClick={() => setText(wording)}
                >
                  {wording}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {remark ? (
            <p dir="auto" className="mb-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <MessageSquare aria-hidden="true" className="me-1.5 inline size-3.5 text-muted-foreground" />
              {remark}
            </p>
          ) : null}
          {canRemark ? (
            <NButton type="button" variant="ghost" className={item} onClick={() => setEditing(true)}>
              <MessageSquarePlus aria-hidden="true" className="size-4 text-primary" />
              {remark ? t('grades.studentMenu.editRemark') : t('grades.studentMenu.addRemark')}
            </NButton>
          ) : null}
          {editable && status !== 'missed' ? (
            <NButton type="button" variant="ghost" className={item} onClick={() => run(onToggleAbsent)}>
              <UserX aria-hidden="true" className="size-4 text-destructive" />
              {t('grades.studentMenu.markAbsent')}
            </NButton>
          ) : null}
          {editable && status === 'missed' ? (
            <NButton type="button" variant="ghost" className={item} onClick={() => run(onToggleAbsent)}>
              <UserCheck aria-hidden="true" className="size-4 text-emerald-600" />
              {t('grades.studentMenu.undoAbsent')}
            </NButton>
          ) : null}
          {editable && hasMark ? (
            <NButton type="button" variant="ghost" className={item} onClick={() => run(onClearMark)}>
              <Eraser aria-hidden="true" className="size-4 text-muted-foreground" />
              {t('grades.studentMenu.clearMark')}
            </NButton>
          ) : null}
          {!editable && !canRemark ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{t('massar.readOnly')}</p>
          ) : null}
        </div>
      )}
    </NSheet>
  );
}
