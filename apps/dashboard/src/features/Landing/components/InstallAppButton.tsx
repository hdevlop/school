'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { landingFont } from '../config/landingFont';

interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const APK_STEPS = ['landing.install.apkStep1', 'landing.install.apkStep2', 'landing.install.apkStep3'] as const;

function AndroidIcon() {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.65-.38l-1.86 3.22a11.4 11.4 0 0 0-9.86 0L5.21 5.92a.38.38 0 0 0-.65.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
  </svg>;
}

/**
 * On Android, a site that ships its own app (`androidApk`) offers that APK:
 * some phones (Xiaomi/Redmi) silently block the home-screen icon a PWA install
 * creates. Everywhere else, the browser's own install flow.
 */
export function InstallAppButton({ androidApk }: { androidApk?: string | null }) {
  const { t, language } = useTranslation();
  const prompt = useRef<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [installing, setInstalling] = useState(false);
  const [help, setHelp] = useState<'browser' | 'apk' | null>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'mac' | 'desktop'>('desktop');

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)');
    const syncDisplayMode = () => setInstalled(displayMode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      prompt.current = event as InstallPromptEvent;
    };
    const finishInstall = () => {
      prompt.current = null;
      setInstalled(true);
      setHelp(null);
    };

    syncDisplayMode();
    const { userAgent, maxTouchPoints } = navigator;
    if (/iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)) setPlatform('ios');
    else if (/Android/.test(userAgent)) setPlatform('android');
    else if (/Macintosh/.test(userAgent)) setPlatform('mac');

    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', finishInstall);
    displayMode.addEventListener('change', syncDisplayMode);
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', finishInstall);
      displayMode.removeEventListener('change', syncDisplayMode);
      prompt.current = null;
    };
  }, []);

  async function install() {
    if (installing) return;
    const availablePrompt = prompt.current;
    if (!availablePrompt) {
      setHelp('browser');
      return;
    }

    // A browser install event can only be used once, including after dismissal.
    prompt.current = null;
    setInstalling(true);
    try {
      await availablePrompt.prompt();
      await availablePrompt.userChoice;
    } catch {
      setHelp('browser');
    } finally {
      setInstalling(false);
    }
  }

  if (installed !== false) return null;
  const offersApk = platform === 'android' && !!androidApk;

  return <>
    {offersApk
      ? <a href={androidApk!} download className="landing-button landing-hero-button landing-install-button landing-apk-button" onClick={() => setHelp('apk')}>
          <span className="landing-apk-icon"><AndroidIcon /></span>
          {t('landing.install.apkAction')}
          <span className="landing-apk-tag" dir="ltr">APK</span>
        </a>
      : <button type="button" className="landing-button landing-hero-button landing-install-button" disabled={installing} aria-busy={installing} onClick={() => void install()}>
          <Download size={17} aria-hidden />{t('landing.install.action')}
        </button>}
    <Dialog open={help !== null} onOpenChange={(open) => { if (!open) setHelp(null); }}>
      <DialogContent hideClose className={`landing-font-surface ${landingFont.variable} w-[calc(100%-2rem)] max-w-md rounded-xl`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {help === 'apk'
          ? <>
              <DialogHeader className="pe-8 text-start">
                <DialogTitle className="flex items-center gap-2"><span className="landing-apk-icon landing-apk-icon-title"><AndroidIcon /></span>{t('landing.install.apkAction')}</DialogTitle>
                <DialogDescription>{t('landing.install.apkDescription')}</DialogDescription>
              </DialogHeader>
              <ol className="landing-apk-steps">
                {APK_STEPS.map((key, index) => <li key={key}><span aria-hidden>{index + 1}</span>{t(key)}</li>)}
              </ol>
            </>
          : <>
              <DialogHeader className="pe-8 text-start">
                <DialogTitle>{t('landing.install.action')}</DialogTitle>
                <DialogDescription>{t('landing.install.description')}</DialogDescription>
              </DialogHeader>
              <p className="text-sm leading-relaxed">{t(`landing.install.${platform}`)}</p>
              <p className="text-sm text-muted-foreground">{t('landing.install.unavailable')}</p>
            </>}
        <DialogClose className="absolute end-4 top-4 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-label={t('common.close')}>
          <X size={18} aria-hidden />
        </DialogClose>
      </DialogContent>
    </Dialog>
  </>;
}
