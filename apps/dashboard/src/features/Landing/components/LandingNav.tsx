'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, UserRound, ArrowRight } from 'lucide-react';
import { NLanguageMenu, NSheet } from 'najm-kit';
import { NThemeImage } from 'najm-theme/react';
import { useTranslation } from 'najm-i18n/react';
import type { SchoolLocale } from '@sms/contracts/locales';
import { languageOptions } from '@/shared/languageOptions';

export function SchoolBrand({ schoolName }: { schoolName: string }) {
  return <a href="#about" className="landing-brand"><NThemeImage slot="authLogo" alt={schoolName} className="landing-logo" /></a>;
}

export function LandingNav({ schoolName, signedIn, programs, news, contact }: { schoolName: string; signedIn: boolean; programs: boolean; news: boolean; contact: boolean }) {
  const { t, language, changeLanguage } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const links = [['about', true], ['parents', true], ['news', news], ['programs', programs], ['contact', contact]] as const;
  const anchors = links.filter(([, visible]) => visible).map(([id]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>{t(`landing.nav.${id}`)}</a>);
  const portal = <Link href={signedIn ? '/' : '/login'} className="landing-button landing-portal"><UserRound size={17} />{t(signedIn ? 'landing.nav.dashboard' : 'landing.nav.portal')}</Link>;
  return <header className="landing-header"><div className="landing-container landing-header-inner">
    <SchoolBrand schoolName={schoolName} />
    <nav aria-label={t('landing.nav.label')} className="landing-desktop-nav">{anchors}</nav>
    <div className="landing-nav-actions"><NLanguageMenu value={(language ?? 'en') as SchoolLocale}
      options={languageOptions} contentClassName="w-48"
      label={t('landing.nav.language')}
      onChange={async next => { await changeLanguage(next); router.refresh(); }} />
      <div className="landing-desktop-portal">{portal}</div>
      <button className="landing-menu-button" aria-label={t('landing.nav.menu')} aria-expanded={open} onClick={() => setOpen(true)}><Menu /></button>
    </div>
    <NSheet open={open} onOpenChange={setOpen} icon={Menu} title={schoolName} side={language === 'ar' ? 'left' : 'right'}>
      <nav className="landing-mobile-nav" aria-label={t('landing.nav.label')}>{anchors}{portal}</nav>
    </NSheet>
  </div></header>;
}

export function SkipLink({ label }: { label: string }) {
  return <a href="#landing-main" className="landing-skip" onClick={() => document.getElementById('landing-main')?.focus()}>{label}<ArrowRight size={16} /></a>;
}
