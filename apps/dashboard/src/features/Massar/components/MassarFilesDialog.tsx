'use client';
import { useRef, useState } from 'react';
import { AlertCircle, Check, FileArchive, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { NajmScroll, NButton, NDialog } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import type { MassarImportPreview, MassarMappings, MassarSetup, MassarStudentDecisions } from '@sms/contracts';
import { classOrder } from '../config/massarModel';
import { massarPost, previewMassar, useMassarAction } from '../hooks/useMassar';
import { inspectMassarUpload, isMassarUpload, type UploadFileInfo } from '../utils/uploadFileInfo';
import { MassarImportReview } from './MassarImportReview';
import styles from './Massar.module.css';

/** Massar names its exports `export_notesCC_<class>_<subject code>.xlsx`. */
const fileLabel = (file: File, info?: UploadFileInfo) => {
  const match = /export_notesCC_(.+?)_(\d{4})/i.exec(file.name);
  return { className: info?.classes.length === 1 ? info.classes[0] : match?.[1] ?? '' };
};

/** Directory readers return batches, including for folders with more than 100 files. */
async function filesFromEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) return new Promise((resolve, reject) => {
    (entry as FileSystemFileEntry).file(file => resolve([file]), reject);
  });
  if (!entry.isDirectory) return [];
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const files: File[] = [];
  while (true) {
    const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (!entries.length) return files;
    files.push(...(await Promise.all(entries.map(filesFromEntry))).flat());
  }
}

export function MassarFilesDialog({ setup, close }: { setup: MassarSetup; close: () => void }) {
  const { t } = useTranslation(), action = useMassarAction(), filesInput = useRef<HTMLInputElement>(null), folderInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]), [preview, setPreview] = useState<MassarImportPreview | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [details, setDetails] = useState<Map<File, UploadFileInfo>>(new Map()), [expanded, setExpanded] = useState(false), [importing, setImporting] = useState(false);
  const busy = action.pending || reading || importing;
  const uploads = files.filter(isMassarUpload);
  const step = importing ? 3 : preview ? 2 : 1;
  const add = async (chosen: File[]) => {
    const known = new Set(files.map(file => `${file.name}:${file.size}:${file.lastModified}`));
    const added = chosen.filter(file => {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (known.has(key)) return false;
      known.add(key); return true;
    });
    if (!added.length) return;
    setFiles(current => [...current, ...added]);
    setReading(true);
    try {
      const results = new Map<File, UploadFileInfo>();
      for (const file of added) results.set(file, await inspectMassarUpload(file));
      setDetails(current => new Map([...current, ...results]));
    } finally { setReading(false); }
  };
  const addDropped = async (transfer: DataTransfer) => {
    setReading(true);
    try {
      // Capture entries while the drop event still grants access to its items.
      const items = Array.from(transfer.items).filter(item => item.kind === 'file');
      const chosen = items.length ? await Promise.all(items.map(item => {
        const entry = item.webkitGetAsEntry?.();
        if (entry) return filesFromEntry(entry);
        const file = item.getAsFile();
        return file ? [file] : [];
      })) : [Array.from(transfer.files)];
      await add(chosen.flat());
    } catch {
      toast.error(t('massar.ui.readFilesFailed'));
    } finally {
      setReading(false);
    }
  };
  const cancel = async () => { if (preview) await action.run(() => massarPost(`/imports/${preview.previewId}/cancel`)); setPreview(null); };
  const dismiss = async () => { await cancel(); close(); };
  const check = async () => { await action.run(async () => { setPreview(await previewMassar(uploads)); }); };
  const recheck = async () => {
    await action.run(async () => {
      if (preview) await massarPost(`/imports/${preview.previewId}/cancel`);
      setPreview(await previewMassar(uploads));
    });
  };
  const commit = async (data: MassarMappings & MassarStudentDecisions) => {
    if (!preview) return;
    setImporting(true);
    try {
      await action.run(() => massarPost('/imports/commit', { ...data, previewId: preview.previewId, digest: preview.digest, addMissingSheets: true }));
      toast.success(t('massar.flow.classesSaved', { count: preview.classes.length }));
      if (data.additions.length) toast.info(t('massar.flow.studentsAdded', { count: data.additions.length }));
      if (data.fixes.length) toast.info(t('massar.flow.recordsFixed', { count: data.fixes.length }));
      close();
    } finally { setImporting(false); }
  };
  const ordered = files.map(file => ({ file, label: fileLabel(file, details.get(file)) })).sort((a, b) => classOrder(a.label.className, b.label.className));
  const supported = ordered.filter(row => isMassarUpload(row.file)), skipped = ordered.filter(row => !isMassarUpload(row.file));
  const collapsed = [...supported.slice(0, skipped.length ? 3 : 4), ...skipped.slice(0, 1)];
  const shown = expanded ? [...supported, ...skipped] : collapsed;
  const detected = new Set(uploads.flatMap(file => details.get(file)?.classes ?? []));
  const size = (files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(1);
  const remove = (file: File) => {
    setFiles(current => current.filter(item => item !== file));
    setDetails(current => { const next = new Map(current); next.delete(file); return next; });
  };

  return <NDialog open onOpenChange={open => { if (!open && !busy) void dismiss(); }} title={t('massar.importTitle')} size="xl" showButtons={false}
    padding={preview ? 'none' : undefined} className={preview ? styles.importDialog : undefined} headerClassName={preview ? styles.importDialogHeader : undefined}>
    <div className={preview ? styles.importFlow : styles.uploadFlow}>
    <ol className={styles.importSteps} aria-label={t('massar.ui.importSteps')}>
      {['uploadStep', 'reviewStep', 'importStep'].map((key, index) => <li key={key} aria-current={step === index + 1 ? 'step' : undefined} data-complete={step > index + 1}>
        <span className={styles.stepNumber} aria-hidden>{step > index + 1 ? <Check /> : index + 1}</span><span>{t(`massar.ui.${key}`)}</span>
      </li>)}
    </ol>
    {preview ? <MassarImportReview preview={preview} setup={setup} pending={busy} cancel={cancel} commit={commit} recheck={recheck} /> : <><div className={styles.dialogBody}>
      <input ref={filesInput} type="file" hidden multiple accept=".xlsx,.zip" aria-label={t('massar.chooseFiles')} disabled={busy} onChange={event => { void add(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
      <input ref={node => { folderInput.current = node; node?.setAttribute('webkitdirectory', ''); }} type="file" hidden multiple aria-label={t('massar.chooseFolder')} disabled={busy} onChange={event => { void add(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
      <div className={styles.dropzone} role="group" aria-label={t('massar.chooseFiles')} aria-busy={reading} aria-disabled={busy} data-dragging={dragging}
        onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
        onDrop={event => { event.preventDefault(); setDragging(false); if (!busy) void addDropped(event.dataTransfer); }}>
        <span className={styles.dropzoneIcon} aria-hidden>{reading ? <Loader2 className="animate-spin" /> : <Upload />}</span>
        <div className={styles.dropzoneCopy}>
          <p className={styles.dropzoneLine}>{t('massar.ui.dropFiles')}{' '}
            <button type="button" className={styles.dropzoneAction} disabled={busy} onClick={() => filesInput.current?.click()}>{t('massar.ui.browseFiles')}</button>
            <span className={styles.dropzoneDivider} aria-hidden>·</span>
            <button type="button" className={styles.dropzoneAction} disabled={busy} onClick={() => folderInput.current?.click()}>{t('massar.ui.browseFolder')}</button>
          </p>
          <p className={styles.dropzoneHint}>{t('massar.ui.uploadHint')} · {t('massar.ui.uploadLimits')}</p>
          {reading && <span role="status" className="sr-only">{t('common.loading')}</span>}
        </div>
      </div>
      {files.length > 0 && <section className={styles.uploadSelection} aria-label={t('massar.ui.acceptedFiles')}>
        <div className={styles.uploadSelectionHead}>
          <strong aria-live="polite">{detected.size ? t('massar.ui.filesDetected', { files: files.length, classes: detected.size }) : t('massar.ui.filesSelected', { count: files.length, size })}</strong>
          <button type="button" className={styles.linkButton} disabled={busy} onClick={() => { setFiles([]); setDetails(new Map()); setExpanded(false); }}>{t('massar.ui.removeAll')}</button>
        </div>
        <div className={styles.uploadFileList}>
          <NajmScroll axis="y" autoHide="never" className={styles.uploadFileScroll} data-expanded={expanded}>
            <ul>{shown.map(({ file, label }) => {
              const rejected = !isMassarUpload(file), info = details.get(file);
              const Icon = rejected ? AlertCircle : reading && !info ? Loader2 : /\.zip$/i.test(file.name) ? FileArchive : FileSpreadsheet;
              return <li key={`${file.name}:${file.size}:${file.lastModified}`} data-rejected={rejected}>
                <Icon className={reading && !info && !rejected ? 'animate-spin' : undefined} aria-hidden />
                <div className={styles.uploadFileName}><bdi title={file.name}>{file.name}</bdi>{rejected && <small>{t('massar.ui.skippedFile')}</small>}</div>
                {!rejected && label.className && <bdi className={styles.uploadClassTag}>{label.className}</bdi>}
                {!rejected && (info?.classes.length ?? 0) > 1 && <span className={styles.uploadClassTag}>{t('massar.ui.classesDetected', { count: info!.classes.length })}</span>}
                {!rejected && info?.students !== null && info?.students !== undefined && <span className={styles.uploadStudentCount}>{t('massar.studentCount', { count: info.students })}</span>}
                <button type="button" className={styles.uploadRemove} aria-label={t('massar.flow.removeFile', { name: file.name })} disabled={busy} onClick={() => remove(file)}><X aria-hidden /></button>
              </li>;
            })}</ul>
          </NajmScroll>
          {(files.length > collapsed.length || expanded) && <button type="button" className={styles.uploadMore} disabled={busy} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
            {expanded ? t('massar.ui.showLessFiles') : t('massar.ui.showMoreFiles', { count: files.length - collapsed.length })}
          </button>}
        </div>
      </section>}
    </div><div className={styles.dialogFooter}>
      <NButton variant="outline" disabled={busy} onClick={close}>{t('massar.cancel')}</NButton>
      <NButton disabled={!uploads.length || busy} loading={action.pending} onClick={check}>{t('massar.ui.reviewStep')}</NButton>
    </div></>}
    </div>
  </NDialog>;
}
