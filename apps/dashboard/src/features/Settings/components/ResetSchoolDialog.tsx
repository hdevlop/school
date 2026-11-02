'use client';

import { useState, type CSSProperties } from 'react';
import { AlertCircle, Check, Download, Eye, EyeOff, RotateCcw, Trash2, TriangleAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { auth } from '@/najm.auth';
import { resetSchoolApi } from '@/services/backupApi';
import { useBackupDownload } from '../hooks/useBackupDownload';
import { BackupDownloadStatus } from './BackupDownloadStatus';
import { BackupStep, BackupSteps } from './BackupSteps';

const canMaskText = () => typeof CSS !== 'undefined' && CSS.supports('-webkit-text-security', 'disc');

/**
 * Deletes the whole school. The current data must be downloaded first, then the
 * administrator's password and a typed word are asked for; the server checks the
 * password again. Everyone is signed out afterwards.
 */
export function ResetSchoolDialog({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const backup = useBackupDownload();
  const savingCurrent = backup.downloading;
  const [currentSaved, setCurrentSaved] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [typed, setTyped] = useState('');
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = savingCurrent || resetting;
  const word = t('settings.backup.reset.confirmWord');
  const confirmed = typed.trim().toLocaleUpperCase() === word.toLocaleUpperCase();
  // The word sits at a different place in each language's sentence.
  const [confirmBefore, confirmAfter] = t('settings.backup.reset.confirm', { word: '|' }).split('|');
  const ready = currentSaved && Boolean(password) && confirmed && !busy;

  const close = () => {
    if (busy) return;
    setCurrentSaved(false); setPassword(''); setShowPassword(false); setTyped(''); setError(null);
    onOpenChange(false);
  };

  const saveCurrent = async () => {
    if (await backup.download()) setCurrentSaved(true);
  };

  const reset = async () => {
    if (!ready) return;
    setResetting(true);
    setError(null);
    try {
      await resetSchoolApi(password);
    } catch (failure) {
      // The server names the reason: a wrong password, too many attempts, ...
      setError((failure as Error)?.message || t('settings.backup.reset.failed'));
      setPassword('');
      setResetting(false);
      return;
    }
    toast.success(t('settings.backup.reset.done'));
    // The reset ended every session, this one included.
    await auth.client.logout().catch(() => undefined);
    window.location.replace('/login');
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="max-h-[90dvh] max-w-lg gap-5 overflow-y-auto" onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}>
        <DialogHeader className="flex-row items-center gap-3 text-start">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"><RotateCcw className="h-5 w-5" /></span>
          <div className="grid min-w-0 gap-0.5">
            <DialogTitle>{t('settings.backup.reset.title')}</DialogTitle>
            <DialogDescription>{t('settings.backup.reset.subtitle')}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <div className="grid min-w-0 gap-1">
            <p className="font-semibold text-destructive">{t('settings.backup.reset.warningTitle')}</p>
            <p className="leading-relaxed text-muted-foreground">{t('settings.backup.reset.warning')}</p>
          </div>
        </div>

        <BackupSteps>
          <BackupStep number={1} done={currentSaved} title={t('settings.backup.reset.stepDownload')} hint={t('settings.backup.reset.stepDownloadHint')}>
            <div className="w-0 min-w-full">
              <NButton className="w-full" type="button" variant="outline" loading={savingCurrent} disabled={resetting} onClick={saveCurrent}
                leftIcon={currentSaved ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}>
                {currentSaved ? t('settings.backup.restore.safetyDone') : t('settings.backup.download.action')}
              </NButton>
            </div>
            {savingCurrent && <div className="col-span-2"><BackupDownloadStatus progress={backup.progress} /></div>}
          </BackupStep>

          <BackupStep number={2} done={Boolean(password)} title={t('settings.backup.reset.password')} hint={t('settings.backup.reset.passwordHint')} htmlFor="reset-password">
            <div className="relative w-0 min-w-full">
              {/*
                Typed on purpose every time. A real password input makes the browser treat the page as a
                sign-in: it fills this in, and the signed-in email into the nearest text box behind the
                dialog, such as a table's search. So this is a text input with masked characters; only a
                browser that cannot mask text gets a password input.
              */}
              <Input id="reset-password" name="reset-confirmation" type={canMaskText() || showPassword ? 'text' : 'password'} value={password} disabled={resetting}
                autoComplete={canMaskText() ? 'off' : 'new-password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} data-1p-ignore data-lpignore="true" data-bwignore data-form-type="other"
                style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' } as CSSProperties}
                className="pe-10" aria-invalid={Boolean(error) || undefined} onChange={(event) => { setPassword(event.target.value); setError(null); }} />
              <button type="button" disabled={resetting} onClick={() => setShowPassword((shown) => !shown)}
                aria-label={t(showPassword ? 'settings.backup.reset.hidePassword' : 'settings.backup.reset.showPassword')}
                className="absolute inset-y-0 inset-e-0 flex w-10 items-center justify-center rounded-e-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </BackupStep>

          <BackupStep number={3} done={confirmed} htmlFor="reset-confirm" hint={t('settings.backup.reset.confirmHint')}
            title={<>{confirmBefore}<code className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-destructive"><bdi>{word}</bdi></code>{confirmAfter}</>}>
            <Input className="w-0 min-w-full" id="reset-confirm" value={typed} disabled={resetting} autoComplete="off" spellCheck={false} placeholder={word} onChange={(event) => setTyped(event.target.value)} />
          </BackupStep>

          <BackupStep number={4} done={false} last>
            <div>
              <NButton type="button" variant="destructive" loading={resetting} disabled={!ready} onClick={reset} leftIcon={<Trash2 className="h-4 w-4" aria-hidden />}>{t('settings.backup.reset.submit')}</NButton>
            </div>
          </BackupStep>
        </BackupSteps>

        {error && (
          <div role="alert" className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span className="min-w-0 wrap-break-word">{error}</span>
          </div>
        )}
        {resetting && <p role="status" className="text-sm text-muted-foreground">{t('settings.backup.reset.resetting')}</p>}

      </DialogContent>
    </Dialog>
  );
}
