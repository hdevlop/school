'use client';

import { useState } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { downloadBackupApi, type BackupTransferProgress } from '@/services/backupApi';
import { saveBackupFile } from '../utils/backupFiles';

/** Downloads and saves a backup, reporting how far it got. Resolves to whether the file was saved. */
export function useBackupDownload() {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<BackupTransferProgress | null>(null);

  const download = async () => {
    setDownloading(true);
    setProgress(null);
    try {
      const { file, name } = await downloadBackupApi(setProgress);
      saveBackupFile(file, name);
      return true;
    } catch (failure) {
      toast.error((failure as Error)?.message || t('settings.backup.download.failed'));
      return false;
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  };

  return { download, downloading, progress };
}
