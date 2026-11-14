'use client';
import type { ReactNode } from 'react';
import { NButton, NDialog } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { MassarSheetRow } from '@sms/contracts';
import styles from './Massar.module.css';

type DialogState = { open: boolean; onOpenChange: (open: boolean) => void; pending: boolean };

/** A small dialog with a body and Cancel / confirm buttons, as every round dialog here is. */
function RoundDialog({ open, onOpenChange, pending, title, children, confirm, confirmDisabled, onConfirm }: DialogState & {
  title: string; children: ReactNode; confirm: string; confirmDisabled?: boolean; onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return <NDialog open={open} onOpenChange={onOpenChange} title={title} size="sm" showButtons={false}>
    <div className={styles.dialogBody}>{children}</div>
    <div className={styles.dialogFooter}>
      <NButton variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>{t('massar.cancel')}</NButton>
      <NButton disabled={pending || confirmDisabled} loading={pending} onClick={onConfirm}>{confirm}</NButton>
    </div>
  </NDialog>;
}

function DueDateField({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const { t } = useTranslation();
  return <label className={styles.field}>
    <span>{t('massar.flow.dueLabel')}</span>
    <input type="date" className={styles.input} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} />
  </label>;
}

/** Opens the next Contrôle, with its due date for marks (the plan's date, when it has one). */
export function OpenControlDialog({ title, readyCount, waiting, dueDate, onDueDate, exists, onConfirm, ...state }: DialogState & {
  title: string;
  /** Classes that get their sheets now; `waiting` ones get them once their students are matched. */
  readyCount: number;
  waiting: boolean;
  dueDate: string;
  onDueDate: (value: string) => void;
  /** This Contrôle is already open. */
  exists: boolean;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return <RoundDialog {...state} title={title} confirm={t('massar.flow.open')} confirmDisabled={exists} onConfirm={onConfirm}>
    <p>{t('massar.flow.openHelp', { count: readyCount })}</p>
    {waiting && <p>{t('massar.flow.waitingHelp')}</p>}
    <DueDateField value={dueDate} onChange={onDueDate} disabled={state.pending} />
  </RoundDialog>;
}

/** Changes the open Contrôle's due date for marks; empty removes it. */
export function DueDateDialog({ dueDate, onDueDate, onConfirm, ...state }: DialogState & {
  dueDate: string;
  onDueDate: (value: string) => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return <RoundDialog {...state} title={t('massar.flow.changeDueDate')} confirm={t('massar.flow.confirm')} onConfirm={onConfirm}>
    <DueDateField value={dueDate} onChange={onDueDate} disabled={state.pending} />
    <p>{t('massar.flow.dueHelp')}</p>
  </RoundDialog>;
}

/** Downloads the whole Contrôle for Massar, which locks every sheet it sends. */
export function SendControlDialog({ sheets, sendable, onConfirm, ...state }: DialogState & {
  sheets: MassarSheetRow[];
  sendable: MassarSheetRow[];
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const incomplete = sendable.filter(sheet => sheet.missing).length;
  const skipped = sheets.length - sendable.length;
  return <RoundDialog {...state} title={t('massar.flow.download')} confirm={t('massar.flow.download')} confirmDisabled={!sendable.length} onConfirm={onConfirm}>
    <p>{t('massar.flow.downloadCount', { count: sendable.length })}</p>
    {incomplete > 0 && <p>{t('massar.flow.incomplete', { count: incomplete })}</p>}
    {skipped > 0 && <p className={styles.notice} data-tone="warning">{t('massar.flow.downloadSkipped', { count: skipped })}</p>}
  </RoundDialog>;
}
