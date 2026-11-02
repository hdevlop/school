'use client';

import { useEffect, useState } from 'react';
import { useNajmFormat } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { BackupTransferProgress } from '@/services/backupApi';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const percentOf = (progress: BackupTransferProgress | null) =>
  progress?.total ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : null;

/**
 * Shows that a backup is still on its way. A percentage appears only once it is
 * real: while the server builds the file the bar just moves and the time counts.
 */
export function BackupDownloadStatus({ progress }: { progress: BackupTransferProgress | null }) {
  const { t } = useTranslation();
  const format = useNajmFormat();
  const percent = percentOf(progress);
  const message = !progress
    ? t('settings.backup.download.preparing')
    : percent !== null
      ? t('settings.backup.download.downloading', { percent: format.number(percent) })
      : t('settings.backup.download.downloadingSize', { size: format.number(Math.round(progress.loaded / 104857.6) / 10) });
  return <BackupStatusBar message={message} percent={percent} />;
}

/**
 * The same for a restore: the file's upload has a real percentage, and once it
 * has all arrived the server works without reporting how far it got.
 */
export function BackupRestoreStatus({ progress }: { progress: BackupTransferProgress | null }) {
  const { t } = useTranslation();
  const format = useNajmFormat();
  const percent = percentOf(progress);
  return percent !== null && percent < 100
    ? <BackupStatusBar message={t('settings.backup.restore.uploading', { percent: format.number(percent) })} percent={percent} />
    : <BackupStatusBar message={t('settings.backup.restore.restoring')} percent={null} />;
}

function BackupStatusBar({ message, percent }: { message: string; percent: number | null }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((elapsed) => elapsed + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="grid gap-1.5" role="status">
      <div
        role="progressbar"
        aria-label={message}
        aria-valuemin={percent === null ? undefined : 0}
        aria-valuemax={percent === null ? undefined : 100}
        aria-valuenow={percent ?? undefined}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        {percent === null
          ? <div className="h-full w-full animate-pulse rounded-full bg-primary/60" />
          : <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />}
      </div>
      <div className="flex justify-between gap-3 text-xs text-muted-foreground">
        <span className="min-w-0">{message}</span>
        <span className="shrink-0 tabular-nums"><bdi>{clock(seconds)}</bdi></span>
      </div>
    </div>
  );
}
