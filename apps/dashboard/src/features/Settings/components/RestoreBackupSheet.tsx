'use client';

import { useState } from 'react';
import { Check, Download, FileArchive, TriangleAlert } from 'lucide-react';
import { Input, NAlert, NButton, useNajmFormat } from 'najm-kit';
import { FileImportDialog } from '@/components/FileImportDialog';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import type { BackupManifest } from '@sms/contracts/backup';
import { auth } from '@/najm.auth';
import { restoreBackupApi, type BackupTransferProgress } from '@/services/backupApi';
import { useBackupDownload } from '../hooks/useBackupDownload';
import { BACKUP_CONTENT_TABLES, readBackupManifest } from '../utils/backupFiles';
import { BackupDownloadStatus, BackupRestoreStatus } from './BackupDownloadStatus';
import { BackupStep, BackupSteps } from './BackupSteps';

/**
 * Replaces the whole school with a backup. The file is checked and described
 * first; the current data must be downloaded (when the viewer may) and a word
 * typed before the restore is sent. Everyone is signed out afterwards.
 */
export function RestoreBackupSheet({ open, onOpenChange, canDownload }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canDownload: boolean;
}) {
  const { t } = useTranslation();
  const format = useNajmFormat();
  const [file, setFile] = useState<File | null>(null);
  const [manifest, setManifest] = useState<BackupManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const backup = useBackupDownload();
  const savingCurrent = backup.downloading;
  const [currentSaved, setCurrentSaved] = useState(false);
  const [typed, setTyped] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<BackupTransferProgress | null>(null);
  const busy = reading || savingCurrent || restoring;
  const word = t('settings.backup.restore.confirmWord');
  const confirmed = typed.trim().toLocaleUpperCase() === word.toLocaleUpperCase();
  const [confirmBefore, confirmAfter] = t('settings.backup.restore.confirm', { word: '|' }).split('|');
  const ready = Boolean(file && manifest) && (currentSaved || !canDownload) && confirmed && !busy;

  const reset = () => {
    setFile(null); setManifest(null); setError(null); setCurrentSaved(false); setTyped('');
  };
  const close = () => {
    if (busy) return;
    reset();
    onOpenChange(false);
  };

  const choose = async (chosen: File | null) => {
    if (busy) return;
    setManifest(null); setError(null); setFile(chosen); setTyped('');
    if (!chosen) return;
    setReading(true);
    const check = await readBackupManifest(chosen);
    setReading(false);
    if ('error' in check) { setError(t(check.error)); return; }
    setManifest(check.manifest);
  };

  const saveCurrent = async () => {
    if (await backup.download()) setCurrentSaved(true);
  };

  const restore = async () => {
    if (!file || !ready) return;
    setRestoring(true);
    setUploadProgress({ loaded: 0, total: file.size });
    setError(null);
    try {
      await restoreBackupApi(file, setUploadProgress);
    } catch (failure) {
      // The server names the reason: another version, a damaged file, ...
      setError((failure as Error)?.message || t('settings.backup.restore.failed'));
      setRestoring(false);
      return;
    }
    toast.success(t('settings.backup.restore.done'));
    // The restore ended every session, this one included.
    await auth.client.logout().catch(() => undefined);
    window.location.replace('/login');
  };

  return (
    <FileImportDialog
      open={open}
      onClose={close}
      title={t('settings.backup.restore.title')}
      fileLabel={t('settings.backup.restore.file')}
      accept=".zip,application/zip" fileIcon={FileArchive}
      file={file} onFile={choose} busy={busy} reading={reading} saving={restoring} disabled={false}
      canSubmit={ready} onSubmit={restore} error={error}
      submitLabel={t('settings.backup.restore.submit')} destructive hideFooter hideUploadWhenSelected
      notice={<NAlert tone="warning" icon={TriangleAlert} description={t('settings.backup.restore.warning')} />}
    >
      <div className="flex flex-col gap-5 text-sm">
        {manifest && (
          <div className="flex flex-col gap-3 rounded-md border p-3">
            <div>
              {manifest.schoolName && <p className="font-medium"><bdi>{manifest.schoolName}</bdi></p>}
              <p className="text-muted-foreground">{t('settings.backup.restore.madeOn', { date: format.dateTime(manifest.createdAt) })}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
              {BACKUP_CONTENT_TABLES.map((table) => (
                <div key={table} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t(`settings.backup.contents.${table}`)}</dt>
                  <dd className="tabular-nums">{format.number(manifest.tables[table] ?? 0)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t('settings.backup.contents.files')}</dt>
                <dd className="tabular-nums">{format.number(manifest.files.count)}</dd>
              </div>
            </dl>
          </div>
        )}

        {manifest && <BackupSteps>
          {canDownload && (
            <BackupStep number={1} done={currentSaved} title={t('settings.backup.restore.safetyTitle')} hint={t('settings.backup.restore.safetyDescription')}>
              <div>
                <NButton type="button" variant="outline" loading={savingCurrent} disabled={restoring} onClick={saveCurrent}
                  leftIcon={currentSaved ? <Check className="h-4 w-4" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}>
                  {currentSaved ? t('settings.backup.restore.safetyDone') : t('settings.backup.download.action')}
                </NButton>
              </div>
              {savingCurrent && <div className="col-span-2"><BackupDownloadStatus progress={backup.progress} /></div>}
            </BackupStep>
          )}

          <BackupStep number={canDownload ? 2 : 1} done={confirmed} htmlFor="backup-confirm" hint={t('settings.backup.restore.confirmHint')}
            title={<>{confirmBefore}<code className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-destructive"><bdi>{word}</bdi></code>{confirmAfter}</>}>
            <Input className={canDownload ? 'w-0 min-w-full' : 'w-44 max-w-full'} id="backup-confirm" value={typed} disabled={restoring} autoComplete="off" spellCheck={false} placeholder={word} onChange={(event) => setTyped(event.target.value)} />
          </BackupStep>

          <BackupStep number={canDownload ? 3 : 2} done={false} last>
            <div className="w-0 min-w-full">
              <NButton className="w-full" type="button" variant="destructive" loading={restoring} disabled={!ready} onClick={restore}>{t('settings.backup.restore.submit')}</NButton>
            </div>
          </BackupStep>
        </BackupSteps>}

        {restoring && <BackupRestoreStatus progress={uploadProgress} />}
      </div>
    </FileImportDialog>
  );
}
