'use client'

import React, { useEffect, useRef, useState } from 'react';
import { Camera, FileText, Loader2, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { HOMEWORK_LIMITS, HOMEWORK_UPLOAD_ACCEPT, type HomeworkAttachment } from '@sms/contracts';
import { compressImage } from '@/lib/compressImage';
import { fileRefusal, fileSizeLabel, refusalLimitMb, remainingFileSlots } from '../config/homeworkFiles';
import HomeworkAttachments from './HomeworkAttachments';

type Props = {
  homeworkId?: string;
  /** The stored files that are still there; purged ones are not offered for removal. */
  stored: HomeworkAttachment[];
  removedIds: string[];
  onRemovedIdsChange: (ids: string[]) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
};

/**
 * A picked image shown from memory; the URL is released when the tile goes.
 * Made in the effect, not a memo: a remount (Strict Mode runs cleanup once in
 * development) would otherwise keep showing a URL its cleanup had revoked.
 */
const PickedPreview = ({ file }: { file: File }) => {
  const isImage = file.type.startsWith('image/');
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!isImage) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isImage]);
  if (!isImage) return <FileText className="h-6 w-6 text-primary" aria-hidden />;
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element -- a local preview of a file not uploaded yet
  return <img src={url} alt="" className="h-full w-full object-cover" />;
};

/**
 * Photos and PDFs of a homework: what is stored, what was just picked, and
 * two ways to add more. Photos are reduced here before they are sent; the
 * server reduces them again and decides what is kept.
 */
const HomeworkFilePicker = ({ homeworkId, stored, removedIds, onRemovedIdsChange, files, onFilesChange }: Props) => {
  const { t } = useTranslation();
  const [preparing, setPreparing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const kept = stored.filter((attachment) => !removedIds.includes(attachment.id));
  const slots = remainingFileSlots(kept.length, files.length);

  const addFiles = async (picked: FileList | null) => {
    const chosen = Array.from(picked ?? []);
    if (!chosen.length) return;
    if (chosen.length > slots) toast.error(t('homework.form.tooManyFiles', { max: HOMEWORK_LIMITS.attachments }));
    setPreparing(true);
    try {
      const accepted: File[] = [];
      for (const file of chosen.slice(0, slots)) {
        const prepared = await compressImage(file, { maxEdge: HOMEWORK_LIMITS.imageEdge });
        const refusal = fileRefusal(prepared);
        if (refusal) toast.error(`${file.name}: ${t(`homework.errors.${refusal}`, { max: refusalLimitMb(refusal) })}`);
        else accepted.push(prepared);
      }
      if (accepted.length) onFilesChange([...files, ...accepted]);
    } finally {
      setPreparing(false);
    }
  };

  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    void addFiles(event.target.files);
    // The same file can be picked again after it was removed.
    event.target.value = '';
  };

  return (
    <div className="flex flex-col gap-3">
      {homeworkId && kept.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {kept.map((attachment) => (
            <div key={attachment.id} className="relative">
              <HomeworkAttachments homeworkId={homeworkId} attachments={[attachment]} />
              <button
                type="button"
                onClick={() => onRemovedIdsChange([...removedIds, attachment.id])}
                className="absolute end-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                aria-label={t('homework.form.removeFile')}
                title={t('homework.form.removeFile')}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${file.size}-${index}`} className="relative flex h-44 w-full max-w-xs flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border bg-muted/40 text-center text-xs text-muted-foreground">
              <PickedPreview file={file} />
              {!file.type.startsWith('image/') && <span className="px-1 leading-tight">{fileSizeLabel(file.size)}</span>}
              <button
                type="button"
                onClick={() => onFilesChange(files.filter((_, position) => position !== index))}
                className="absolute end-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                aria-label={t('homework.form.removeFile')}
                title={t('homework.form.removeFile')}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* One row on every screen: on a phone the two buttons share the width, each label cut short if it must. */}
      <div className="flex flex-nowrap items-center gap-2">
        <NButton type="button" variant="outline" size="sm" className="min-w-0 flex-1 sm:flex-none" disabled={preparing || slots === 0} onClick={() => fileInput.current?.click()}>
          <Paperclip className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{t('homework.form.addFiles')}</span>
        </NButton>
        <NButton type="button" variant="outline" size="sm" className="min-w-0 flex-1 sm:flex-none" disabled={preparing || slots === 0} onClick={() => cameraInput.current?.click()}>
          <Camera className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{t('homework.form.takePhoto')}</span>
        </NButton>
      </div>
      {/* Its own line, so the buttons keep the row. */}
      {preparing && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {t('homework.form.preparing')}
        </span>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('homework.form.attachmentsHint', { max: HOMEWORK_LIMITS.attachments, pdf: Math.round(HOMEWORK_LIMITS.pdfBytes / (1024 * 1024)) })}
      </p>

      <input ref={fileInput} type="file" accept={HOMEWORK_UPLOAD_ACCEPT} multiple hidden onChange={onPick} />
      {/* `capture` opens the rear camera on a phone; a computer shows the file dialog. */}
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
    </div>
  );
};

export default HomeworkFilePicker;
