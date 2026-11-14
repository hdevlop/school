import { HOMEWORK_LIMITS, type HomeworkAttachment } from '@sms/contracts';

const MB = 1024 * 1024;

/** The attachments whose file is still stored: the ones that count toward the limit. */
export const liveAttachments = (attachments: readonly HomeworkAttachment[] = []) =>
  attachments.filter((attachment) => !attachment.purgedAt);

/** How many more files the homework can take, given what it keeps and what is already picked. */
export function remainingFileSlots(kept: number, picked: number) {
  return Math.max(0, HOMEWORK_LIMITS.attachments - kept - picked);
}

export type FileRefusal = 'unsupportedFile' | 'pdfTooLarge' | 'imageTooLarge';

/**
 * Why the form will not send a file, or null. The server checks the bytes and
 * refuses the same things; this only spares the upload. An image is measured
 * after the browser reduced it.
 */
export function fileRefusal(file: { type: string; size: number }): FileRefusal | null {
  if (file.type === 'application/pdf') return file.size > HOMEWORK_LIMITS.pdfBytes ? 'pdfTooLarge' : null;
  if (!file.type.startsWith('image/')) return 'unsupportedFile';
  return file.size > HOMEWORK_LIMITS.imageUploadBytes ? 'imageTooLarge' : null;
}

/** The number a refusal names: the limit in MB, as the server's message does. */
export const refusalLimitMb = (refusal: FileRefusal) =>
  Math.round((refusal === 'pdfTooLarge' ? HOMEWORK_LIMITS.pdfBytes : HOMEWORK_LIMITS.imageUploadBytes) / MB);

/** A file size for a caption: KB under 1 MB, one decimal of MB above. */
export function fileSizeLabel(bytes: number) {
  return bytes < MB ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / MB).toFixed(1)} MB`;
}
