'use client';

import { useState, type ChangeEvent } from 'react';
import { Check, Download, TriangleAlert, Upload } from 'lucide-react';
import { Input, NAlert, NButton, NSheet, useNajmFormat } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import type { BackupManifest } from '@sms/contracts/backup';
import { auth } from '@/najm.auth';
import { downloadBackupApi, restoreBackupApi } from '@/services/backupApi';
import { BACKUP_CONTENT_TABLES, readBackupManifest, saveBackupFile } from '../utils/backupFiles';

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
  const [savingCurrent, setSavingCurrent] = useState(false);
  const [currentSaved, setCurrentSaved] = useState(false);
  const [typed, setTyped] = useState('');
  const [restoring, setRestoring] = useState(false);
  const word = t('settings.backup.restore.confirmWord');
  const confirmed = typed.trim().toLocaleUpperCase() === word.toLocaleUpperCase();
  const ready = Boolean(file && manifest) && (currentSaved || !canDownload) && confirmed && !restoring;

  const reset = () => {
    setFile(null); setManifest(null); setError(null); setCurrentSaved(false); setTyped('');
  };
  const close = () => {
    if (restoring) return;
    reset();
    onOpenChange(false);
  };

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    // The input keeps its file, so the chosen name stays on screen.
    const chosen = event.target.files?.[0] ?? null;
    setManifest(null); setError(null); setFile(null);
    if (!chosen) return;
    setReading(true);
    const check = await readBackupManifest(chosen);
    setReading(false);
    if ('error' in check) { setError(t(check.error)); return; }
    setFile(chosen);
    setManifest(check.manifest);
  };

  const saveCurrent = async () => {
    setSavingCurrent(true);
    try {
      const { file: current, name } = await downloadBackupApi();
      saveBackupFile(current, name);
      setCurrentSaved(true);
    } catch (failure) {
      toast.error((failure as Error)?.message || t('settings.backup.download.failed'));
    } finally {
      setSavingCurrent(false);
    }
  };

  const restore = async () => {
    if (!file || !ready) return;
    setRestoring(true);
    setError(null);
    try {
      await restoreBackupApi(file);
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
    <NSheet
      open={open}
      onOpenChange={(next) => { if (!next) close(); }}
      icon={Upload}
      title={t('settings.backup.restore.title')}
      description={t('settings.backup.restore.description')}
      footer={<div className="flex justify-end gap-2">
        <NButton type="button" variant="outline" disabled={restoring} onClick={close}>{t('common.cancel')}</NButton>
        <NButton type="button" variant="destructive" loading={restoring} disabled={!ready} onClick={restore}>
          {t('settings.backup.restore.submit')}
        </NButton>
      </div>}
    >
      <div className="flex flex-col gap-5 text-sm">
        <NAlert tone="warning" icon={TriangleAlert} description={t('settings.backup.restore.warning')} />

        <div className="flex flex-col gap-2">
          <label className="font-medium" htmlFor="backup-file">{t('settings.backup.restore.file')}</label>
          <input
            id="backup-file"
            type="file"
            accept=".zip,application/zip"
            disabled={restoring || reading}
            onChange={choose}
            className="w-full min-w-0 rounded-md border p-3 text-sm file:me-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1"
          />
        </div>

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

        {manifest && canDownload && (
          <div className="flex flex-col gap-2">
            <p className="font-medium">{t('settings.backup.restore.safetyTitle')}</p>
            <p className="text-muted-foreground">{t('settings.backup.restore.safetyDescription')}</p>
            <div>
              <NButton type="button" variant="outline" loading={savingCurrent} disabled={restoring} onClick={saveCurrent}>
                {currentSaved ? <Check className="h-4 w-4" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
                {currentSaved ? t('settings.backup.restore.safetyDone') : t('settings.backup.download.action')}
              </NButton>
            </div>
          </div>
        )}

        {manifest && (
          <div className="flex flex-col gap-2">
            <label className="font-medium" htmlFor="backup-confirm">{t('settings.backup.restore.confirm', { word })}</label>
            <Input id="backup-confirm" value={typed} disabled={restoring} autoComplete="off" onChange={(event) => setTyped(event.target.value)} />
          </div>
        )}

        {restoring && <p role="status" className="text-muted-foreground">{t('settings.backup.restore.restoring')}</p>}
        {error && <NAlert tone="error" description={error} />}
      </div>
    </NSheet>
  );
}
