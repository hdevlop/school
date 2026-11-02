'use client'

import React, { useState } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import { NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';

import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useBackupDownload } from '../../hooks/useBackupDownload';
import { BackupDownloadStatus } from '../BackupDownloadStatus';
import { SettingsGroup } from '../SettingsGroup';
import { ResetSchoolDialog } from '../ResetSchoolDialog';
import { RestoreBackupSheet } from '../RestoreBackupSheet';

/** Download the whole school as one file, or replace it with one. Not part of the settings form. */
const BackupSection: React.FC = () => {
  const { t } = useTranslation();
  const { can, role } = useViewerRole();
  const backup = useBackupDownload();
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const canDownload = can('backup:system');
  const canRestore = can('restore:system');

  const download = async () => {
    if (await backup.download()) toast.success(t('settings.backup.download.done'));
  };

  return (
    <>
    <SettingsGroup title={t('settings.backup.title')} description={t('settings.backup.description')} className="sm:grid-cols-1">
      <div className="flex flex-wrap gap-2">
        {canDownload && (
          <NButton type="button" loading={backup.downloading} onClick={download} leftIcon={<Download className="h-4 w-4" aria-hidden />}>
            {t('settings.backup.download.action')}
          </NButton>
        )}
        {canRestore && (
          <NButton type="button" variant="outline" onClick={() => setRestoreOpen(true)}>
            <Upload className="h-4 w-4" aria-hidden />
            {t('settings.backup.restore.action')}
          </NButton>
        )}
      </div>
      {backup.downloading && <BackupDownloadStatus progress={backup.progress} />}
      {canRestore && <RestoreBackupSheet open={restoreOpen} onOpenChange={setRestoreOpen} canDownload={canDownload} />}
    </SettingsGroup>
    {role === 'admin' && (
      <SettingsGroup title={t('settings.backup.reset.title')} description={t('settings.backup.reset.description')} className="sm:grid-cols-1">
        <div>
          <NButton type="button" variant="destructive" onClick={() => setResetOpen(true)} leftIcon={<RotateCcw className="h-4 w-4" aria-hidden />}>
            {t('settings.backup.reset.action')}
          </NButton>
        </div>
        <ResetSchoolDialog open={resetOpen} onOpenChange={setResetOpen} />
      </SettingsGroup>
    )}
    </>
  );
};

export default BackupSection;
