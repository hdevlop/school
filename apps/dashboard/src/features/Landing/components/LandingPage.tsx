import Image from 'next/image';
import { LandingAvatar } from './LandingAvatar';
import { ArrowRight, MapPin, Phone, Mail, Star, CalendarDays } from 'lucide-react';
import { SocialIcon, SOCIAL_NAMES } from './SocialIcons';
import { schoolI18n, type SchoolLocale, type SchoolTranslationKey } from '@sms/contracts/locales';
import { LANDING_NEWS_FALLBACKS, LANDING_NEWS_SLOTS, type LandingContent, type LandingCycle, type LandingProfile, type LandingText } from '@sms/contracts';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { schoolApp } from '@/najm.config';
import { LandingNav, SkipLink, SchoolBrand } from './LandingNav';
import { LandingImage } from './LandingImage';
import { VisitRequestForm } from './VisitRequestForm';
import { LandingHero } from './LandingHero';
import { LandingSectionTitle } from './LandingSectionTitle';

export function LandingPage({ profile, cycles, content, language, defaultLanguage, signedIn }: {
  profile: LandingProfile | null; cycles: LandingCycle[]; content: LandingContent; language: SchoolLocale; defaultLanguage: SchoolLocale; signedIn: boolean;
}) {
  const t = (key: string) => schoolI18n.translate(language, key as SchoolTranslationKey);
  const localized = (text: LandingText) => text[language] || text[defaultLanguage] || text.en;
  const schoolName = profile?.schoolName || schoolApp.appName;
  const contact = true; // The public visit form is available even on a fresh installation.
  const featureKeys = ['attendance', 'grades', 'classRoutines', 'fees', 'transport', 'announcements'] as const;
  const news = content.news.slice(0, LANDING_NEWS_SLOTS.length);
  const newsDate = new Intl.DateTimeFormat(language === 'ar' ? 'ar-MA' : language, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return <>
    <SkipLink label={t('landing.skip')} />
    <LandingNav schoolName={schoolName} signedIn={signedIn} programs={cycles.length > 0} news={news.length > 0} contact={contact} />
    <main id="landing-main" tabIndex={-1}>
      <LandingHero stats={content.stats} language={language} defaultLanguage={defaultLanguage} programs={cycles.length > 0} />
      <section id="parents" className="landing-stripe"><div className="landing-container landing-section">
        <LandingSectionTitle title={t('landing.features.title')} /><p className="landing-section-intro">{t('landing.features.description')}</p>
        <div className="landing-feature-grid">{featureKeys.map(key => { const Icon = FEATURE_ICONS[key]; return <article key={key} className="landing-feature-card"><Icon aria-hidden /><div><h3>{t(`landing.features.items.${key}.title`)}</h3><p>{t(`landing.features.items.${key}.body`)}</p></div></article>; })}</div>
      </div></section>
      {news.length > 0 && <section id="news" className="landing-stripe"><div className="landing-container landing-section">
        <LandingSectionTitle title={t('landing.news.title')} />
        <div className="landing-news-grid">{news.map((item, index) => <article key={index} className="landing-news-card">
          <div className="landing-news-media"><LandingImage slot={LANDING_NEWS_SLOTS[index]} fallback={LANDING_NEWS_FALLBACKS[index]} alt={localized(item.title) || t('landing.news.title')} sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw" width={1440} height={810} showDisclosure={false} /></div>
          <div className="landing-news-body"><p className="landing-news-date"><CalendarDays size={16} aria-hidden /><time dateTime={item.date}>{newsDate.format(new Date(item.date))}</time></p></div>
        </article>)}</div>
      </div></section>}
      <section className="landing-stripe landing-platform landing-pattern"><div className="landing-container landing-section">
        <LandingSectionTitle title={t('landing.platform.title')} /><div className="landing-devices" dir="ltr">
          <div className="landing-laptop"><div className="landing-laptop-screen"><Image src="/images/landing/product-dashboard.webp" alt={t('landing.platform.dashboardAlt')} width={1920} height={1080} sizes="(min-width: 1024px) 900px, 90vw" /></div><div className="landing-laptop-base" /></div>
          <div className="landing-phone landing-product-phone"><Image src="/images/landing/product-parent.webp" alt={t('landing.platform.parentAlt')} width={887} height={1774} sizes="240px" /></div>
        </div><p className="landing-powered">{t('landing.powered')} <strong>{schoolApp.appName}</strong></p><p className="landing-disclosure">{t('landing.demoDisclosure')}</p>
      </div></section>
      <section className="landing-stripe"><div className="landing-container landing-section landing-assistant">
        <div><p className="landing-eyebrow">{t('landing.assistant.eyebrow')}</p><LandingSectionTitle title={t('landing.assistant.title')} /><p className="landing-lead">{t('landing.assistant.subtitle')}</p>
          <div className="landing-language-pills">{['العربية', 'الدارجة', 'Français', 'English', 'Español'].map(name => <span key={name}>{name}</span>)}</div>
        </div>
        <figure className="landing-assistant-visual"><Image src="/images/landing/assistant-chatbot.webp" alt={t('landing.assistant.alt')} width={1448} height={1086} sizes="(min-width: 1024px) 700px, 100vw" />
          <figcaption className="landing-disclosure">{t('landing.demoDisclosure')} · {t('landing.photoDisclosure')}</figcaption></figure>
      </div></section>
      {cycles.length > 0 && <section id="programs" className="landing-stripe"><div className="landing-container landing-section">
        <LandingSectionTitle title={t('landing.programs.title')} /><p className="landing-section-intro">{t('landing.programs.description')}</p>
        <div className="landing-program-grid">{cycles.map(cycle => { const name = cycle.labels?.[language] || cycle.name; const slot = content.programPhotoSlots[cycle.id]; return <article className="landing-program-card" key={cycle.id}>
          <LandingImage slot={slot} fallback={slot ? `/images/landing/program-${slot.slice(-1)}.webp` : '/images/landing/program-default.webp'} alt={t('landing.programs.alt')} sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw" width={1440} height={810} />
          <div><h3>{name}</h3><p>{content.programBlurbs[cycle.id] ? localized(content.programBlurbs[cycle.id]) : t('landing.programs.subtitle')}</p><a href="#contact" aria-label={schoolI18n.translate(language, 'landing.programs.cta', { program: name })}><ArrowRight className="landing-arrow" size={21} /></a></div>
        </article>; })}</div>
      </div></section>}
      {content.testimonials.length > 0 && <section className="landing-stripe landing-feedback"><div className="landing-container landing-section"><LandingSectionTitle title={t('landing.testimonials.title')} /><p className="landing-section-intro">{t('landing.testimonials.description')}</p><div className="landing-testimonials">
        {content.testimonials.map((item, index) => <article key={index}><LandingAvatar author={item.author} /><div><p aria-label={`${item.rating}/5`} className="landing-stars">{Array.from({ length: item.rating }, (_,i) => <Star key={i} size={19} fill="currentColor" />)}</p><blockquote>{localized(item.quote)}</blockquote><p>{item.author}</p></div></article>)}
      </div></div></section>}
      <section id="contact" className="landing-stripe landing-contact landing-pattern"><div className={`landing-container landing-section landing-contact-grid ${!profile?.schoolAddress && profile?.schoolAddressLatitude == null ? 'landing-contact-single' : ''}`}>
        {(profile?.schoolAddress || profile?.schoolAddressLatitude != null) && <div className="landing-map">
          {profile.schoolAddressLatitude != null && profile.schoolAddressLongitude != null && <iframe loading="lazy" title={t('landing.contact.map')} referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${profile.schoolAddressLatitude},${profile.schoolAddressLongitude}&z=15&output=embed`} />}
          {profile.schoolAddress && <p><MapPin size={20} />{profile.schoolAddress}</p>}
        </div>}
        <div className="landing-contact-head"><LandingSectionTitle title={t(content.admissionsOpen ? 'landing.admissions.open' : 'landing.admissions.title')} suffix={content.admissionsOpen ? content.admissionsYearLabel : undefined} /><p className="landing-contact-subtitle">{t('landing.admissions.subtitle')}</p></div>
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
