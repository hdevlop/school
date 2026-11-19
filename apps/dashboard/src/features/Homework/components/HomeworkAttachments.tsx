'use client'

import React from 'react';
import { FileText, FileX, ImageOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import type { HomeworkAttachment } from '@sms/contracts';
import { useHomeworkAttachment } from '../hooks/useHomeworkAttachment';
import { fileSizeLabel } from '../config/homeworkFiles';

const tile = 'flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border bg-muted/40 p-2 text-center text-xs text-muted-foreground';
const detailTile = 'flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border bg-muted/40 p-4 text-center text-sm text-muted-foreground';

/** A file that is no longer there, said in words: never a broken image. */
const GoneTile = ({ label, detailed }: { label: string; detailed: boolean }) => (
  <div className={detailed ? detailTile : tile}>
    {detailed ? <FileX className="size-9 opacity-80" aria-hidden /> : <ImageOff className="size-5" aria-hidden />}
    <span className="max-w-60 leading-tight">{label}</span>
  </div>
);

const StoredFile = ({ homeworkId, attachment, detailed }: { homeworkId: string; attachment: HomeworkAttachment; detailed: boolean }) => {
  const { t } = useTranslation();
  const { url, isLoading, isError } = useHomeworkAttachment(homeworkId, attachment.id);
  const surface = detailed ? detailTile : tile;

  if (isError) return <GoneTile label={t('homework.attachments.unavailable')} detailed={detailed} />;
  if (isLoading || !url) {
    return <div className={surface}><Loader2 className="h-5 w-5 animate-spin" aria-hidden /></div>;
  }
  if (attachment.kind === 'pdf') {
    return (
      <a href={url} target="_blank" rel="noreferrer" className={`${surface} hover:bg-muted`}>
        <FileText className="h-6 w-6 text-primary" aria-hidden />
        <span className="font-medium text-foreground">{t('homework.attachments.pdf')}</span>
        <span>{fileSizeLabel(attachment.size)}</span>
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer"
      className={detailed ? 'block w-full overflow-hidden rounded-xl border bg-muted/40' : 'block h-28 w-28 shrink-0 overflow-hidden rounded-lg border bg-muted/40'}
      title={t('homework.attachments.open')}>
      {/* A local object URL of a private file: next/image cannot load it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={t('homework.attachments.photo')} className={detailed ? 'max-h-80 w-full object-contain' : 'h-full w-full object-cover'} />
    </a>
  );
};

/** The files of one homework, in the order the teacher added them. */
const HomeworkAttachments = ({ homeworkId, attachments, detailed = false }: { homeworkId: string; attachments: HomeworkAttachment[]; detailed?: boolean }) => {
  const { t } = useTranslation();
  if (!attachments.length) return null;
  return (
    <div className={detailed ? 'grid gap-2' : 'flex flex-wrap gap-2'}>
      {attachments.map((attachment) => attachment.purgedAt
        ? <GoneTile key={attachment.id} label={t('homework.attachments.purged')} detailed={detailed} />
        : <StoredFile key={attachment.id} homeworkId={homeworkId} attachment={attachment} detailed={detailed} />)}
    </div>
  );
};

export default HomeworkAttachments;
