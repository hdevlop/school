import Image from 'next/image';
import { LandingAvatar } from './LandingAvatar';
import { ArrowRight, Check, MapPin, Phone, Mail, Star, UsersRound, GraduationCap, Award, BookOpen, CalendarDays } from 'lucide-react';
import { SocialIcon, SOCIAL_NAMES } from './SocialIcons';
import { schoolI18n, type SchoolLocale, type SchoolTranslationKey } from '@sms/contracts/locales';
import { LANDING_NEWS_FALLBACKS, LANDING_NEWS_SLOTS, type LandingContent, type LandingCycle, type LandingProfile, type LandingText } from '@sms/contracts';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { schoolApp } from '@/najm.config';
import { LandingNav, SkipLink, SchoolBrand } from './LandingNav';
import { LandingImage } from './LandingImage';
import { VisitRequestForm } from './VisitRequestForm';

export function LandingPage({ profile, cycles, content, language, defaultLanguage, signedIn }: {
  profile: LandingProfile | null; cycles: LandingCycle[]; content: LandingContent; language: SchoolLocale; defaultLanguage: SchoolLocale; signedIn: boolean;
}) {
  const t = (key: string) => schoolI18n.translate(language, key as SchoolTranslationKey);
  const localized = (text: LandingText) => text[language] || text[defaultLanguage] || text.en;
  const schoolName = profile?.schoolName || schoolApp.appName;
  const contact = true; // The public visit form is available even on a fresh installation.
  const featureKeys = ['attendance', 'grades', 'classRoutines', 'fees', 'transport', 'announcements'] as const;
  const statIcons = [UsersRound, GraduationCap, Award, BookOpen];
  // Card N keeps photo slot N even when an earlier card has no text in any language.
  const news = content.news.map((item, index) => ({ item, index })).filter(({ item }) => localized(item.title));
  const newsDate = new Intl.DateTimeFormat(language === 'ar' ? 'ar-MA' : language, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return <>
    <SkipLink label={t('landing.skip')} />
    <LandingNav schoolName={schoolName} signedIn={signedIn} programs={cycles.length > 0} news={news.length > 0} contact={contact} />
    <main id="landing-main" tabIndex={-1}>
      <section id="about" className="landing-intro"><div className="landing-container landing-hero">
        <div className="landing-hero-copy">
          <h1>{t('landing.hero.titleStart')} <span>{t('landing.hero.titleAccent')}</span></h1>
          <p className="landing-lead">{t('landing.hero.subtitle')}</p>
          <div className="landing-cta-row"><a href="#contact" className="landing-button">{t('landing.hero.visit')}<ArrowRight className="landing-arrow" size={19} /></a>
            {cycles.length > 0 && <a href="#programs" className="landing-button landing-button-outline">{t('landing.hero.programs')}</a>}</div>
        </div>
        <div className="landing-hero-visual"><LandingImage slot="landingHero" fallback="/images/landing/hero.webp" alt={t('landing.hero.alt')} sizes="(min-width: 1024px) 660px, 100vw" hero />
          <div className="landing-ornament landing-ornament-one"><span className="landing-check"><Check /></span><span>{t('landing.features.items.attendance.title')}</span></div>
          <div className="landing-ornament landing-ornament-two"><Award /><span>{t('landing.features.items.grades.title')}</span></div>
        </div>
      </div></section>
      {content.stats.length > 0 && <section className="landing-stats landing-container" aria-label={t('landing.stats')}>
        {content.stats.map((stat, index) => { const Icon = statIcons[index]; return <div key={index}><Icon aria-hidden /><p><strong>{stat.value}</strong><span>{localized(stat.label)}</span></p></div>; })}
      </section>}
      <section id="parents" className="landing-stripe"><div className="landing-container landing-section">
        <h2>{t('landing.features.title')}</h2><p className="landing-section-intro">{t('landing.features.description')}</p>
        <div className="landing-feature-grid">{featureKeys.map(key => { const Icon = FEATURE_ICONS[key]; return <article key={key} className="landing-feature-card"><Icon aria-hidden /><div><h3>{t(`landing.features.items.${key}.title`)}</h3><p>{t(`landing.features.items.${key}.body`)}</p></div></article>; })}</div>
      </div></section>
      {news.length > 0 && <section id="news" className="landing-stripe"><div className="landing-container landing-section">
        <h2>{t('landing.news.title')}</h2><p className="landing-section-intro">{t('landing.news.description')}</p>
        <div className="landing-news-grid">{news.map(({ item, index }) => <article key={index} className="landing-news-card">
          <div className="landing-news-media"><LandingImage slot={LANDING_NEWS_SLOTS[index]} fallback={LANDING_NEWS_FALLBACKS[index]} alt={localized(item.title)} sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw" width={1440} height={810} />
            {localized(item.tag) && <span className="landing-news-tag">{localized(item.tag)}</span>}</div>
          <div className="landing-news-body"><p className="landing-news-date"><CalendarDays size={16} aria-hidden /><time dateTime={item.date}>{newsDate.format(new Date(item.date))}</time></p>
            <h3>{localized(item.title)}</h3>{localized(item.body) && <p>{localized(item.body)}</p>}</div>
        </article>)}</div>
      </div></section>}
      <section className="landing-stripe landing-platform landing-pattern"><div className="landing-container landing-section">
        <h2>{t('landing.platform.title')}</h2><div className="landing-devices" dir="ltr">
          <div className="landing-laptop"><div className="landing-laptop-screen"><Image src="/images/landing/product-dashboard.webp" alt={t('landing.platform.dashboardAlt')} width={1440} height={1000} sizes="(min-width: 1024px) 900px, 90vw" /></div><div className="landing-laptop-base" /></div>
          <div className="landing-phone landing-product-phone"><Image src="/images/landing/product-parent.webp" alt={t('landing.platform.parentAlt')} width={390} height={780} sizes="240px" /></div>
        </div><p className="landing-powered">{t('landing.powered')} <strong>{schoolApp.appName}</strong></p><p className="landing-disclosure">{t('landing.demoDisclosure')}</p>
      </div></section>
      <section className="landing-stripe"><div className="landing-container landing-section landing-assistant">
        <div><p className="landing-eyebrow">{t('landing.assistant.eyebrow')}</p><h2>{t('landing.assistant.title')}</h2><p className="landing-lead">{t('landing.assistant.subtitle')}</p>
          <div className="landing-language-pills">{['العربية', 'الدارجة', 'Français', 'English', 'Español'].map(name => <span key={name}>{name}</span>)}</div>
        </div>
        <figure className="landing-assistant-visual"><Image src="/images/landing/assistant-showcase.webp" alt={t('landing.assistant.alt')} width={1448} height={1086} sizes="(min-width: 1024px) 700px, 100vw" />
          <figcaption className="landing-disclosure">{t('landing.demoDisclosure')} · {t('landing.photoDisclosure')}</figcaption></figure>
      </div></section>
      {cycles.length > 0 && <section id="programs" className="landing-stripe"><div className="landing-container landing-section">
        <h2>{t('landing.programs.title')}</h2><p className="landing-section-intro">{t('landing.programs.description')}</p>
        <div className="landing-program-grid">{cycles.map(cycle => { const name = cycle.labels?.[language] || cycle.name; const slot = content.programPhotoSlots[cycle.id]; return <article className="landing-program-card" key={cycle.id}>
          <LandingImage slot={slot} fallback={slot ? `/images/landing/program-${slot.slice(-1)}.webp` : '/images/landing/program-default.webp'} alt={t('landing.programs.alt')} sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw" width={1440} height={810} />
          <div><h3>{name}</h3><p>{content.programBlurbs[cycle.id] ? localized(content.programBlurbs[cycle.id]) : t('landing.programs.subtitle')}</p><a href="#contact" aria-label={schoolI18n.translate(language, 'landing.programs.cta', { program: name })}><ArrowRight className="landing-arrow" size={21} /></a></div>
        </article>; })}</div>
      </div></section>}
      {content.testimonials.length > 0 && <section className="landing-stripe landing-feedback"><div className="landing-container landing-section"><h2>{t('landing.testimonials.title')}</h2><p className="landing-section-intro">{t('landing.testimonials.description')}</p><div className="landing-testimonials">
        {content.testimonials.map((item, index) => <article key={index}><LandingAvatar author={item.author} /><div><p aria-label={`${item.rating}/5`} className="landing-stars">{Array.from({ length: item.rating }, (_,i) => <Star key={i} size={19} fill="currentColor" />)}</p><blockquote>{localized(item.quote)}</blockquote><p>{item.author}</p></div></article>)}
      </div></div></section>}
      <section id="contact" className="landing-stripe landing-contact landing-pattern"><div className={`landing-container landing-section landing-contact-grid ${!profile?.schoolAddress && profile?.schoolAddressLatitude == null ? 'landing-contact-single' : ''}`}>
        {(profile?.schoolAddress || profile?.schoolAddressLatitude != null) && <div className="landing-map">
          {profile.schoolAddressLatitude != null && profile.schoolAddressLongitude != null && <iframe loading="lazy" title={t('landing.contact.map')} referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${profile.schoolAddressLatitude},${profile.schoolAddressLongitude}&z=15&output=embed`} />}
          {profile.schoolAddress && <p><MapPin size={20} />{profile.schoolAddress}</p>}
        </div>}
        <div className="landing-contact-head"><h2>{content.admissionsOpen ? `${t('landing.admissions.open')}${content.admissionsYearLabel ? ` · ${content.admissionsYearLabel}` : ''}` : t('landing.admissions.title')}</h2><p className="landing-contact-subtitle">{t('landing.admissions.subtitle')}</p></div>
        <div className="landing-contact-form"><VisitRequestForm cycles={cycles} language={language} /></div>
      </div></section>
    </main>
    <footer className="landing-container landing-footer"><SchoolBrand schoolName={schoolName} /><div className="landing-footer-contact">
      {profile?.schoolAddress && <p><MapPin size={16} />{profile.schoolAddress}</p>}{profile?.schoolPhone && <a href={`tel:${profile.schoolPhone}`}><Phone size={16} /><span dir="ltr">{profile.schoolPhone}</span></a>}{profile?.schoolEmail && <a href={`mailto:${profile.schoolEmail}`}><Mail size={16} />{profile.schoolEmail}</a>}
      {profile?.schoolWebsite && /^https?:\/\//.test(profile.schoolWebsite) && <a href={profile.schoolWebsite}>{t('landing.contact.website')}</a>}
    </div><div><div className="landing-socials">{(Object.keys(SOCIAL_NAMES) as (keyof typeof SOCIAL_NAMES)[]).filter(key => content.socialLinks[key]).map(key => <a key={key} href={content.socialLinks[key]} aria-label={SOCIAL_NAMES[key]} rel="noopener noreferrer"><SocialIcon name={key} /></a>)}</div><p className="landing-powered">{t('landing.powered')} <strong>{schoolApp.appName}</strong></p></div>
      <small>© {new Date().getFullYear()} {schoolName}. {t('landing.footer.rights')}</small></footer>
  </>;
}
