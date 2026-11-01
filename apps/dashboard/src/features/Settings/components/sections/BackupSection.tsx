'use client'

import React, { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';

import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { downloadBackupApi } from '@/services/backupApi';
import { SettingsGroup } from '../SettingsGroup';
import { RestoreBackupSheet } from '../RestoreBackupSheet';
import { saveBackupFile } from '../../utils/backupFiles';

/** Download the whole school as one file, or replace it with one. Not part of the settings form. */
const BackupSection: React.FC = () => {
  const { t } = useTranslation();
  const { can } = useViewerRole();
  const [downloading, setDownloading] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const canDownload = can('backup:system');

  const download = async () => {
    setDownloading(true);
    try {
      const { file, name } = await downloadBackupApi();
      saveBackupFile(file, name);
      toast.success(t('settings.backup.download.done'));
    } catch (failure) {
      toast.error((failure as Error)?.message || t('settings.backup.download.failed'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {canDownload && (
        <SettingsGroup title={t('settings.backup.download.title')} description={t('settings.backup.download.description')} className="sm:grid-cols-1">
          <div>
            <NButton type="button" loading={downloading} onClick={download}>
              <Download className="h-4 w-4" aria-hidden />
              {t('settings.backup.download.action')}
            </NButton>
          </div>
        </SettingsGroup>
      )}
      {can('restore:system') && (
        <SettingsGroup title={t('settings.backup.restore.title')} description={t('settings.backup.restore.description')} className="sm:grid-cols-1">
          <div>
            <NButton type="button" variant="outline" onClick={() => setRestoreOpen(true)}>
              <Upload className="h-4 w-4" aria-hidden />
              {t('settings.backup.restore.action')}
            </NButton>
          </div>
          <RestoreBackupSheet open={restoreOpen} onOpenChange={setRestoreOpen} canDownload={canDownload} />
        </SettingsGroup>
      )}
    </>
  );
};

export default BackupSection;
