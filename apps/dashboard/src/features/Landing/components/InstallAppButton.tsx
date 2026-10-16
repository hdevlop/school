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

export function InstallAppButton() {
  const { t, language } = useTranslation();
  const prompt = useRef<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [installing, setInstalling] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
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
      setShowHelp(false);
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
      setShowHelp(true);
      return;
    }

    // A browser install event can only be used once, including after dismissal.
    prompt.current = null;
    setInstalling(true);
    try {
      await availablePrompt.prompt();
      await availablePrompt.userChoice;
    } catch {
      setShowHelp(true);
    } finally {
      setInstalling(false);
    }
  }

  if (installed !== false) return null;

  return <>
    <button type="button" className="landing-button landing-hero-button landing-install-button" disabled={installing} aria-busy={installing} onClick={() => void install()}>
      <Download size={17} aria-hidden />{t('landing.install.action')}
    </button>
    <Dialog open={showHelp} onOpenChange={setShowHelp}>
      <DialogContent hideClose className={`landing-font-surface ${landingFont.variable} w-[calc(100%-2rem)] max-w-md rounded-xl`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <DialogHeader className="pe-8 text-start">
          <DialogTitle>{t('landing.install.action')}</DialogTitle>
          <DialogDescription>{t('landing.install.description')}</DialogDescription>
        </DialogHeader>
        <p className="text-sm leading-relaxed">{t(`landing.install.${platform}`)}</p>
        <p className="text-sm text-muted-foreground">{t('landing.install.unavailable')}</p>
        <DialogClose className="absolute end-4 top-4 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-label={t('common.close')}>
          <X size={18} aria-hidden />
        </DialogClose>
      </DialogContent>
    </Dialog>
  </>;
}
