'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, UserRound, ArrowRight, X, ChevronRight, School, UsersRound, Newspaper, BookOpen, Mail, type LucideIcon } from 'lucide-react';
import { NLanguageMenu, Sheet, SheetContent, SheetClose, SheetTitle, SheetDescription } from 'najm-kit';
import { NThemeImage } from 'najm-theme/react';
import { useTranslation } from 'najm-i18n/react';
import type { SchoolLocale } from '@sms/contracts/locales';
import { languageOptions } from '@/shared/languageOptions';
import { landingFont } from '../config/landingFont';

export function SchoolBrand({ schoolName }: { schoolName: string }) {
  return <a href="#about" className="landing-brand"><NThemeImage slot="authLogo" alt={schoolName} className="landing-logo" /></a>;
}

const LINK_ICONS: Record<string, LucideIcon> = { about: School, parents: UsersRound, news: Newspaper, programs: BookOpen, contact: Mail };

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
      options={languageOptions} contentClassName={`w-48 landing-font-surface ${landingFont.variable}`}
      label={t('landing.nav.language')}
      onChange={async next => { await changeLanguage(next); router.refresh(); }} />
      <div className="landing-desktop-portal">{portal}</div>
      <button className="landing-menu-button" aria-label={t('landing.nav.menu')} aria-expanded={open} onClick={() => setOpen(true)}><Menu /></button>
    </div>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side={language === 'ar' ? 'left' : 'right'} className={`landing-sheet landing-font-surface ${landingFont.variable}`}>
        <div className="landing-sheet-header">
          <NThemeImage slot="authLogo" alt="" className="landing-sheet-logo" />
          <div className="landing-sheet-heading">
            <SheetTitle className="landing-sheet-title">{schoolName}</SheetTitle>
            <SheetDescription className="landing-sheet-tagline">{t('landing.meta.tagline')}</SheetDescription>
          </div>
          <SheetClose className="landing-sheet-close" aria-label={t('common.close')}><X size={18} /></SheetClose>
        </div>
        <nav className="landing-sheet-nav" aria-label={t('landing.nav.label')}>
          {links.filter(([, visible]) => visible).map(([id]) => {
            const Icon = LINK_ICONS[id];
            return <a key={id} href={`#${id}`} onClick={() => setOpen(false)} className="landing-sheet-link">
              <span className="landing-sheet-icon"><Icon size={18} /></span>
              <span className="landing-sheet-label">{t(`landing.nav.${id}`)}</span>
              <ChevronRight size={16} className="landing-sheet-chevron" />
            </a>;
          })}
        </nav>
        <div className="landing-sheet-footer">{portal}</div>
      </SheetContent>
    </Sheet>
  </div></header>;
}

export function SkipLink({ label }: { label: string }) {
  return <a href="#landing-main" className="landing-skip" onClick={() => document.getElementById('landing-main')?.focus()}>{label}<ArrowRight size={16} /></a>;
}
