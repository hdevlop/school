"use client";

import React from 'react';
import { Megaphone, Users, Building, User, Calendar, CalendarOff } from 'lucide-react';
import { NSectionInfo } from 'najm-kit';
import { NBadge } from 'najm-kit';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';;
import { useTranslation } from '@/hooks/useLanguage';
import { Label } from 'najm-kit';

const formatDate = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const AnnouncementCard = ({ data }: any) => {
  const { t } = useTranslation();
  const a = data;
  const status = a.isPublished ? 'published' : 'draft';
  const authorName = a.author?.name || a.author?.email;
  const publishDate = formatDate(a.publishDate);
  const expiryDate = formatDate(a.expiryDate);
  const classCount = a.classIds?.length || 0;
  const classLabel = a.class?.name
    ? `${a.class.name}${classCount > 1 ? ` +${classCount - 1}` : ''}`
    : classCount
      ? `${classCount} classes`
      : null;

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center dark:bg-primary">
          <Megaphone className="w-6 h-6 text-primary dark:text-white" />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-md font-bold">{a.title}</Label>
          <NBadge statusMap={STATUS_COLOR_MAP} status={status} />
        </div>

        {a.content && (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">
            {a.content}
          </div>
        )}

        <div className="space-y-2">
          <NSectionInfo
            icon={Users}
            iconColor="text-primary"
            label={t('announcements.form.targetAudience')}
            value={t(`announcements.audience.${a.targetAudience}`)}
            valueColor="text-primary"
          />

          {authorName && (
            <NSectionInfo
              icon={User}
              iconColor="text-muted-foreground"
              label={t('announcements.table.author')}
              value={authorName}
              valueColor="text-foreground font-medium"
            />
          )}

          {classLabel && (
            <NSectionInfo
              icon={Building}
              iconColor="text-muted-foreground"
              label={t('announcements.form.class')}
              value={classLabel}
              valueColor="text-foreground font-medium"
            />
          )}

          {publishDate && (
            <NSectionInfo
              icon={Calendar}
              iconColor="text-muted-foreground"
              label={t('announcements.form.publishDate')}
              value={publishDate}
              valueColor="text-foreground font-medium"
            />
          )}

          {expiryDate && (
            <NSectionInfo
              icon={CalendarOff}
              iconColor="text-muted-foreground"
              label={t('announcements.form.expiryDate')}
              value={expiryDate}
              valueColor="text-foreground font-medium"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCard;
