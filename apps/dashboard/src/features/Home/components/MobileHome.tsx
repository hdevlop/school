'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight, LockKeyhole, Menu } from 'lucide-react';
import { NAvatar, NButton, cn, useNajmFormat, useNSidebar } from 'najm-kit';
import { useAuth, usePermissions } from 'najm-auth/client/react';
import { useTranslation } from 'najm-i18n/react';
import { NotificationsMenu } from '@/features/Notifications';
import LanguageSwitcher from '@/features/Settings/components/LanguageSwitcher';
import { PAGE_ACCESS } from '@/shared/pageAccess';
import { useNavigationActions } from '@/shared/DashboardShell/NavigationActions';
import { HOME_SECTIONS, createHomeCards, type HomeCard } from '../config/homeFeatures';
import { HOME_ICON_ATLAS, HOME_ICON_INDEX } from '../config/homeIllustrations';
import styles from './MobileHome.module.css';

function FeatureIllustration({ card }: { card: HomeCard }) {
  const index = HOME_ICON_INDEX[card.id];
  const Icon = card.icon;
  return index === undefined ? <Icon className={styles.fallbackIcon} /> : (
    <span className={styles.illustration} style={{
      backgroundImage: 'url("' + HOME_ICON_ATLAS + '")',
      backgroundPosition: (index % 6) * 20 + '% ' + Math.floor(index / 6) * 20 + '%',
    }} />
  );
}

function FeatureCard({ card }: { card: HomeCard }) {
  const { t } = useTranslation();
  const actions = useNavigationActions();
  const content = (
    <>
      <span aria-hidden className={styles.illustrationFrame} data-tone={card.tone}><FeatureIllustration card={card} /></span>
      <span className={styles.cardLabel}>{card.label}</span>
      {!card.accessible && <LockKeyhole className={styles.lockIcon} aria-hidden />}
    </>
  );
  if (card.accessible && card.href) {
    return <Link href={card.href} prefetch={false} className={styles.featureCard}>{content}</Link>;
  }
  if (card.accessible && card.action) {
    return <button type="button" className={styles.featureCard} onClick={() => { if (card.action) actions?.openThemeSettings(card.action); }}>{content}</button>;
  }
  return (
    <button type="button" disabled title={t('mobileHome.viewUnavailable')} aria-label={card.label + ': ' + t('mobileHome.viewUnavailable')} className={cn(styles.featureCard, styles.locked)}>
      {content}
    </button>
  );
}

export default function MobileHome() {
  const { user } = useAuth();
  const { can, permissions } = usePermissions();
  const { t } = useTranslation();
  const { timeZone } = useNajmFormat();
  const sidebar = useNSidebar();
  const [greeting, setGreeting] = useState('mobileHome.welcome');
  const viewer = { role: user?.role, can };
  const cards = createHomeCards(t, viewer, permissions)
    .sort((a, b) => HOME_SECTIONS.indexOf(a.section) - HOME_SECTIONS.indexOf(b.section)
      || (HOME_ICON_INDEX[a.id] ?? 99) - (HOME_ICON_INDEX[b.id] ?? 99));
  const name = user?.name || user?.email || '';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join('').toLocaleUpperCase();
  const role = user?.role ?? '';

  useEffect(() => {
    const updateGreeting = () => {
      const hour = Number(new Intl.DateTimeFormat('en', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
      setGreeting(hour < 12 ? 'mobileHome.goodMorning' : hour < 18 ? 'mobileHome.goodAfternoon' : 'mobileHome.goodEvening');
    };
    updateGreeting();
    const interval = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(interval);
  }, [timeZone]);

  return (
    <main className={styles.screen}>
      <link rel="preload" as="image" href={HOME_ICON_ATLAS} />
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <NButton type="button" size="icon" variant="ghost" onClick={() => sidebar?.openMobile()} aria-label={t('mobileHome.openMenu')} className={cn(styles.menuButton, 'lg:hidden')}>
              <Menu className="size-5" aria-hidden />
            </NButton>
            <h1 className={styles.greeting}>{t(greeting)} <span aria-hidden>👋</span></h1>
          </div>
          <div className={styles.headerActions}><LanguageSwitcher /><NotificationsMenu /></div>
        </header>

        <Link href={(role === 'parent' || role === 'student') && PAGE_ACCESS.students(viewer) ? '/students' : '/preferences'} prefetch={false} className={styles.profile}>
          <NAvatar src={typeof user?.image === 'string' ? user.image : undefined} fallbackSrc={role === 'admin' ? '/images/admin.png' : undefined} fallback={initials} alt={name} size="lg" classNames={{ avatar: styles.profileAvatar, fallback: styles.avatarFallback }} />
          <div className={styles.profileText}>
            <p className={styles.name}>{name}</p>
            <p className={styles.email}>{user?.email}</p>
          </div>
          <ChevronRight className={styles.chevron} aria-hidden />
        </Link>

        <div className={styles.grid}>
          {cards.map((card) => <FeatureCard key={card.id} card={card} />)}
        </div>
      </div>
    </main>
  );
}
