import Image from 'next/image';
import { ArrowRight, Calculator, Palette, PencilRuler } from 'lucide-react';
import { LANDING_HERO_FALLBACK, type LandingContent, type LandingText } from '@sms/contracts';
import { schoolI18n, type SchoolLocale, type SchoolTranslationKey } from '@sms/contracts/locales';
import { LandingImage } from './LandingImage';

export function LandingHero({ stats, language, defaultLanguage, programs }: {
  stats: LandingContent['stats'];
  language: SchoolLocale;
  defaultLanguage: SchoolLocale;
  programs: boolean;
}) {
  const t = (key: SchoolTranslationKey) => schoolI18n.translate(language, key);
  const localized = (text: LandingText) => text[language] || text[defaultLanguage] || text.en;

  return <section id="about" className="landing-intro" aria-labelledby="landing-hero-title">
    <div className="landing-container landing-hero">
      <div className="landing-hero-copy">
        <p className="landing-hero-eyebrow">{t('landing.hero.eyebrow')}</p>
        <h1 id="landing-hero-title">
          <span className="landing-hero-title-line">{t('landing.hero.titleStart')} <em className="landing-hero-wonder">{t('landing.hero.titleWonder')}</em> {t('landing.hero.titleEnd')}</span>{' '}
          <span className="landing-hero-title-line"><em className="landing-hero-curiosity">{t('landing.hero.titleAccent')}</em> {t('landing.hero.titleEveryday')}</span>
        </h1>
        <div className="landing-cta-row">
          <a href="#contact" className="landing-button landing-hero-button">{t('landing.hero.visit')}<span><ArrowRight className="landing-arrow" size={15} aria-hidden /></span></a>
          {programs && <a href="#programs" className="landing-hero-programs">{t('landing.hero.programs')}<ArrowRight className="landing-arrow" size={16} aria-hidden /></a>}
        </div>
        <svg className="landing-hero-scribble" viewBox="0 0 80 90" fill="none" aria-hidden="true" focusable="false">
          <path d="M12 12C61 5 74 60 50 50C26 39 71 28 66 76M12 12L24 8M12 12L19 23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="landing-hero-visual landing-hero-boy">
        <LandingImage slot="landingHero" fallback={LANDING_HERO_FALLBACK} alt={t('landing.hero.alt')} sizes="(min-width: 1200px) 370px, (min-width: 768px) 32vw, 50vw" width={800} height={960} hero />
        <svg className="landing-hero-doodle landing-hero-triangle" viewBox="0 0 64 48" aria-hidden="true" focusable="false">
          <path d="M4 42L38 5L60 35Z" fill="#6cce8e" stroke="#25352e" strokeWidth="2" strokeLinejoin="round" />
          <path d="M23 34L37 19L46 31Z" fill="var(--landing-hero-page)" stroke="#25352e" strokeWidth="1.5" />
          <path d="M13 39L14 35M19 38L20 34M25 37L26 33M31 36L32 32M37 35L38 32M43 34L44 31M49 33L50 30" stroke="#25352e" strokeWidth="1.5" />
        </svg>
        <Calculator className="landing-hero-doodle landing-hero-calculator" aria-hidden />
      </div>

      <div className="landing-hero-girl">
        <figure className="landing-hero-girl-photo">
          <Image src="/images/landing/hero-moroccan-girl.webp" alt="" width={800} height={1200} sizes="(min-width: 1200px) 370px, (min-width: 768px) 32vw, 50vw" loading="eager" />
        </figure>
        <Palette className="landing-hero-doodle landing-hero-palette" aria-hidden />
        <PencilRuler className="landing-hero-doodle landing-hero-pencils" aria-hidden />
      </div>

      <p className="landing-hero-summary">{t('landing.hero.subtitle')}</p>

      {stats.length > 0 && <dl className="landing-stats" aria-label={t('landing.stats')}>
        {stats.map((stat, index) => <div className="landing-stat-card" key={index}>
          <dt>{localized(stat.label)}</dt><dd dir="ltr">{stat.value}</dd>
        </div>)}
      </dl>}
    </div>
  </section>;
}
