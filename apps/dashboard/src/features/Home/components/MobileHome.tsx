'use client';

import dynamic from 'next/dynamic';
import Link, { useLinkStatus } from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight, Loader2, LockKeyhole, Menu } from 'lucide-react';
import { NAvatar, NButton, cn, useNajmFormat, useNSidebar } from 'najm-kit';
import { useAuth, usePermissions } from 'najm-auth/client/react';
import { useTranslation } from 'najm-i18n/react';
import { HeaderActionsMenu } from '@/components/HeaderActionsMenu';
import { NotificationsMenu } from '@/features/Notifications';
import LanguageSwitcher from '@/features/Settings/components/LanguageSwitcher';
import { PAGE_ACCESS } from '@/shared/pageAccess';
import { useNavigationActions } from '@/shared/DashboardShell/NavigationActions';
import { useSidebarOrder } from '@/features/Roles/hooks/useSidebarOrder';
import { createHomeCards, type HomeCard } from '../config/homeFeatures';
import { HOME_ICON_ATLAS, HOME_ICON_INDEX } from '../config/homeIllustrations';
import { accountAvatar } from '../config/accountAvatar';
import { avatarVersion } from '@/lib/avatarVersion';
import { useOpenedOnce } from '@/hooks/useOpenedOnce';
import { usePressFeedback } from './usePressFeedback';
import styles from './MobileHome.module.css';

const HomeProfileSheet = dynamic(() => import('./HomeProfileSheet'), { ssr: false });

// Kept inside each Link so cancelled or superseded navigations clear themselves.
function NavigationHint() {
  const { pending } = useLinkStatus();
  const { t } = useTranslation();
  return (
    <span className={cn(styles.navigationHint, pending && styles.navigationPending)} role="status">
      <Loader2 className={styles.navigationSpinner} aria-hidden />
      {pending && <span className="sr-only">{t('common.loading')}</span>}
    </span>
  );
}

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
  const pressFeedback = usePressFeedback();
  const content = (
    <>
      <span aria-hidden className={styles.illustrationFrame} data-tone={card.tone}><FeatureIllustration card={card} /></span>
      <span className={styles.cardLabel}>{card.label}</span>
      {!card.accessible && <LockKeyhole className={styles.lockIcon} aria-hidden />}
    </>
  );
  if (card.accessible && card.href) {
    return <Link href={card.href} prefetch={false} className={styles.featureCard} {...pressFeedback}>{content}<NavigationHint /></Link>;
  }
  if (card.accessible && card.action) {
    return <button type="button" className={styles.featureCard} {...pressFeedback} onClick={() => { if (card.action) actions?.openThemeSettings(card.action); }}>{content}</button>;
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
  const [profileOpen, setProfileOpen] = useState(false);
  const profilePressFeedback = usePressFeedback();
  const profileOpened = useOpenedOnce(profileOpen);
  // Shared with the shell's sidebar query. The server already read the order for
  // this page, so the tiles are in its first HTML; without that read they wait
  // for the browser's answer rather than reshuffle.
  const { data: sidebarOrder = [], isLoading: isOrderLoading } = useSidebarOrder();
  const viewer = { role: user?.role, can };
  const cards = isOrderLoading ? [] : createHomeCards(t, viewer, permissions, sidebarOrder);
  const name = user?.name || user?.email || '';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join('').toLocaleUpperCase();
  const role = user?.role ?? '';
  const person = user as typeof user & { gender?: string | null; updatedAt?: string | null };
  const image = typeof user?.image === 'string' ? user.image : undefined;
  const familyProfile = (role === 'parent' || role === 'student') && PAGE_ACCESS.students(viewer);
  const profileContent = (
    <>
      <NAvatar
        src={image}
        fallbackSrc={accountAvatar(role, person?.gender)}
        fallback={initials}
        alt={name}
        size="lg"
        version={avatarVersion(image, person?.updatedAt)}
        classNames={{ avatar: styles.profileAvatar, fallback: styles.avatarFallback }}
      />
      <div className={styles.profileText}>
        <p className={styles.name}>{name}</p>
        <p className={styles.email}>{user?.email}</p>
      </div>
      <ChevronRight className={styles.chevron} aria-hidden />
    </>
  );

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
      {/* The server renders Home for every width; only a phone or tablet shows the tiles. */}
      <link rel="preload" as="image" type="image/webp" href={HOME_ICON_ATLAS} media="(max-width: 1023px)" fetchPriority="high" />
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <NButton type="button" size="icon" variant="ghost" onClick={() => sidebar?.openMobile()} aria-label={t('mobileHome.openMenu')} className={cn(styles.menuButton, 'lg:hidden')}>
              <Menu className="size-5" aria-hidden />
            </NButton>
            <h1 className={styles.greeting}>{t(greeting)} <span aria-hidden>👋</span></h1>
          </div>
          <div className={styles.headerActions}>
            <HeaderActionsMenu><LanguageSwitcher /><NotificationsMenu /></HeaderActionsMenu>
          </div>
        </header>

        {familyProfile ? (
          <Link href="/students" prefetch={false} className={styles.profile} {...profilePressFeedback}>{profileContent}<NavigationHint /></Link>
        ) : (
          <button type="button" onClick={() => setProfileOpen(true)} className={cn(styles.profile, 'w-full text-start')} aria-haspopup="dialog" aria-expanded={profileOpen} {...profilePressFeedback}>
            {profileContent}
          </button>
        )}

        <div className={styles.grid}>
          {cards.map((card) => <FeatureCard key={card.id} card={card} />)}
        </div>
      </div>
      {profileOpened && <HomeProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />}
    </main>
  );
}
