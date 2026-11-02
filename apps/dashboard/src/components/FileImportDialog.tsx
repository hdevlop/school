'use client';

import { useId, useState, type ReactNode } from 'react';
import { AlertCircle, FileJson, Loader2, Upload, X, type LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, NButton, useResolvedToolbarLabels } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

/** Document imports share the table import appearance while retaining their own validation and preview. */
export function FileImportDialog({ open, title, description, fileLabel, file, busy, reading, saving, disabled, canSubmit, error, onClose, onFile, onSubmit, children,
  accept = '.json,application/json', fileIcon: FileIcon = FileJson, notice, submitLabel = title, destructive = false, hideFooter = false, hideUploadWhenSelected = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  fileLabel: string;
  file: File | null;
  busy: boolean;
  reading: boolean;
  saving: boolean;
  disabled: boolean;
  canSubmit: boolean;
  error: string | null;
  onClose: () => void;
  onFile: (file: File | null) => void;
  onSubmit: () => void;
  children?: ReactNode;
  accept?: string;
  fileIcon?: LucideIcon;
  notice?: ReactNode;
  submitLabel?: string;
  destructive?: boolean;
  hideFooter?: boolean;
  hideUploadWhenSelected?: boolean;
}) {
  const { t } = useTranslation();
  const labels = useResolvedToolbarLabels(undefined);
  const noticeId = useId();
  const [dragging, setDragging] = useState(false);
  const blocked = busy || disabled;

  return <Dialog open={open} onOpenChange={next => { if (!next && !busy) { setDragging(false); onClose(); } }}>
    <DialogContent className="max-h-[90dvh] max-w-xl gap-5 overflow-y-auto" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}
      {...(!description ? { 'aria-describedby': notice ? noticeId : undefined } : {})}>
      <DialogHeader className={`flex-row gap-3 text-start ${description ? 'items-start' : 'items-center'}`}>
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Upload className="h-5 w-5" /></span>
        <div className="grid min-w-0 gap-1.5">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </div>
      </DialogHeader>
      <div className="grid min-w-0 gap-3">
        {notice && <div id={noticeId}>{notice}</div>}
        {!(hideUploadWhenSelected && file) && <label
          onDragOver={event => { event.preventDefault(); if (!blocked) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => { event.preventDefault(); setDragging(false); if (!blocked && event.dataTransfer.files[0]) onFile(event.dataTransfer.files[0]); }}
          className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-colors hover:border-primary/60 hover:bg-primary/5 has-[input:focus-visible]:border-primary has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/50 ${dragging ? 'border-primary bg-primary/10' : ''} ${blocked ? 'pointer-events-none opacity-60' : ''} ${file ? 'flex-row gap-3 py-3' : ''}`}
        >
          <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm ring-1 ring-border ${file ? 'h-8 w-8' : 'h-11 w-11'}`}><Upload className={file ? 'h-4 w-4' : 'h-5 w-5'} /></span>
          <span className="text-sm font-medium text-foreground">{labels.importDrop}</span>
          {!file && <span className="text-xs text-muted-foreground">{fileLabel}</span>}
          <input type="file" aria-label={fileLabel} accept={accept} disabled={blocked} className="sr-only"
            onChange={event => { const chosen = event.target.files?.[0]; event.target.value = ''; if (chosen && !blocked) onFile(chosen); }} />
        </label>}
        {file && <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><FileIcon className="h-5 w-5" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium" title={file.name}>{file.name}</span>
          {reading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}
          <NButton type="button" variant="ghost" size="icon-sm" aria-label={labels.importRemove} title={labels.importRemove} disabled={blocked} onClick={() => onFile(null)}><X className="h-4 w-4" aria-hidden="true" /></NButton>
        </div>}
        {reading && <p role="status" className="sr-only">{labels.importReading}</p>}
        {error && <div role="alert" className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{error}</span>
        </div>}
        {children}
      </div>
      {!hideFooter && <DialogFooter>
        <NButton variant="outline" disabled={busy} onClick={onClose}>{t('common.cancel')}</NButton>
        <NButton variant={destructive ? 'destructive' : 'default'} loading={saving} disabled={!canSubmit || blocked} onClick={onSubmit}>{submitLabel}</NButton>
      </DialogFooter>}
    </DialogContent>
  </Dialog>;
}
