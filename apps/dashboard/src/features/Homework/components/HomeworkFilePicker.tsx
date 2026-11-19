'use client'

import React, { useEffect, useRef, useState } from 'react';
import { Camera, FileText, Loader2, Paperclip, RotateCw, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { HOMEWORK_LIMITS, HOMEWORK_UPLOAD_ACCEPT, type HomeworkAttachment } from '@sms/contracts';
import { compressImage, normalizeTurns, rotateImage } from '@/lib/compressImage';
import { fileRefusal, fileSizeLabel, refusalLimitMb, remainingFileSlots } from '../config/homeworkFiles';
import HomeworkAttachments from './HomeworkAttachments';
import { homeworkAttachmentQuery } from '../hooks/useHomeworkAttachment';

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

/** Where a turned photo came from, so the next turn starts from it again. */
type Turned = { source: File; turns: number; storedId?: string };

const tileButton = 'absolute top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow disabled:opacity-50';

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
  const queryClient = useQueryClient();
  // Keyed by the turned file: a later turn re-renders the original, never the last result.
  const turned = useRef(new WeakMap<File, Turned>());

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

  const rotatePicked = async (index: number) => {
    const file = files[index];
    const origin = turned.current.get(file) ?? { source: file, turns: 0 };
    const turns = normalizeTurns(origin.turns + 1);
    if (turns === 0) {
      // Back where it started: the original, or the stored photo it replaced.
      if (origin.storedId) {
        onFilesChange(files.filter((_, position) => position !== index));
        onRemovedIdsChange(removedIds.filter((id) => id !== origin.storedId));
      } else {
        onFilesChange(files.map((current, position) => (position === index ? origin.source : current)));
      }
      return;
    }
    setPreparing(true);
    try {
      const rotated = await rotateImage(origin.source, origin.source.name, turns, { maxEdge: HOMEWORK_LIMITS.imageEdge });
      if (!rotated) return void toast.error(t('homework.form.rotateFailed'));
      turned.current.set(rotated, { ...origin, turns });
      onFilesChange(files.map((current, position) => (position === index ? rotated : current)));
    } finally {
      setPreparing(false);
    }
  };

  /**
   * A stored photo is turned here and sent again: saving drops the stored file
   * and uploads the turned one in the same request, so cancelling keeps it as
   * it was. It moves to the end of the list, like any file added.
   */
  const rotateStored = async (attachment: HomeworkAttachment) => {
    if (!homeworkId) return;
    setPreparing(true);
    try {
      const blob = await queryClient.fetchQuery(homeworkAttachmentQuery(homeworkId, attachment.id));
      const source = new File([blob], 'photo', { type: blob.type || attachment.mimeType });
      const rotated = await rotateImage(source, source.name, 1, { maxEdge: HOMEWORK_LIMITS.imageEdge });
      if (!rotated) return void toast.error(t('homework.form.rotateFailed'));
      turned.current.set(rotated, { source, turns: 1, storedId: attachment.id });
      onRemovedIdsChange([...removedIds, attachment.id]);
      onFilesChange([...files, rotated]);
    } catch {
      toast.error(t('homework.form.rotateFailed'));
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
              {attachment.kind === 'image' && !attachment.purgedAt && (
                <button
                  type="button"
                  disabled={preparing}
                  onClick={() => void rotateStored(attachment)}
                  className={`${tileButton} start-1`}
                  aria-label={t('homework.form.rotatePhoto')}
                  title={t('homework.form.rotatePhoto')}
                >
                  <RotateCw className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={() => onRemovedIdsChange([...removedIds, attachment.id])}
                className={`${tileButton} end-1`}
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
              {file.type.startsWith('image/') && (
                <button
                  type="button"
                  disabled={preparing}
                  onClick={() => void rotatePicked(index)}
                  className={`${tileButton} start-1`}
                  aria-label={t('homework.form.rotatePhoto')}
                  title={t('homework.form.rotatePhoto')}
                >
                  <RotateCw className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={() => onFilesChange(files.filter((_, position) => position !== index))}
                className={`${tileButton} end-1`}
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
