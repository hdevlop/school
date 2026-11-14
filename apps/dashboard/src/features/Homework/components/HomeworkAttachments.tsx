'use client'

import React from 'react';
import { FileText, ImageOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import type { HomeworkAttachment } from '@sms/contracts';
import { useHomeworkAttachment } from '../hooks/useHomeworkAttachment';
import { fileSizeLabel } from '../config/homeworkFiles';

const tile = 'flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border bg-muted/40 p-2 text-center text-xs text-muted-foreground';

/** A file that is no longer there, said in words: never a broken image. */
const GoneTile = ({ label }: { label: string }) => (
  <div className={tile}>
    <ImageOff className="h-5 w-5" aria-hidden />
    <span className="leading-tight">{label}</span>
  </div>
);

const StoredFile = ({ homeworkId, attachment }: { homeworkId: string; attachment: HomeworkAttachment }) => {
  const { t } = useTranslation();
  const { url, isLoading, isError } = useHomeworkAttachment(homeworkId, attachment.id);

  if (isError) return <GoneTile label={t('homework.attachments.unavailable')} />;
  if (isLoading || !url) {
    return <div className={tile}><Loader2 className="h-5 w-5 animate-spin" aria-hidden /></div>;
  }
  if (attachment.kind === 'pdf') {
    return (
      <a href={url} target="_blank" rel="noreferrer" className={`${tile} hover:bg-muted`}>
        <FileText className="h-6 w-6 text-primary" aria-hidden />
        <span className="font-medium text-foreground">{t('homework.attachments.pdf')}</span>
        <span>{fileSizeLabel(attachment.size)}</span>
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block h-28 w-28 shrink-0 overflow-hidden rounded-lg border bg-muted/40" title={t('homework.attachments.open')}>
      {/* A local object URL of a private file: next/image cannot load it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={t('homework.attachments.photo')} className="h-full w-full object-cover" />
    </a>
  );
};

/** The files of one homework, in the order the teacher added them. */
const HomeworkAttachments = ({ homeworkId, attachments }: { homeworkId: string; attachments: HomeworkAttachment[] }) => {
  const { t } = useTranslation();
  if (!attachments.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((attachment) => attachment.purgedAt
        ? <GoneTile key={attachment.id} label={t('homework.attachments.purged')} />
        : <StoredFile key={attachment.id} homeworkId={homeworkId} attachment={attachment} />)}
    </div>
  );
};

export default HomeworkAttachments;
