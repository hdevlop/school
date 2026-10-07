'use client';

import { BookOpen, Mail, MapPin, MessageCircle, Phone, UserRound, type LucideIcon } from 'lucide-react';
import { NAvatar, NButton, NCard, NCardAction, NSkeleton, SimpleTooltip, cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { TeacherDashboardOverview } from '@sms/contracts/teacher-dashboard';

type TeacherInfoCardProps = {
  overview: TeacherDashboardOverview | undefined;
  // Set when the page has a Details tab to open.
  onViewDetails?: () => void;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
};

type ContactAction = {
  key: string;
  icon: LucideIcon;
  // Missing when the record has nothing to reach the teacher by.
  href: string | null;
  external?: boolean;
};

// The card body stacks the portrait over the contact buttons, which keep to
// the bottom; where the overview fits it scrolls rather than grow the row.
const PROFILE_CARD = {
  root: 'fit:min-h-0',
  content: 'flex flex-col fit:min-h-0 fit:flex-1 fit:overflow-y-auto',
};

const InfoSkeleton = () => (
  <div className="flex flex-col items-center gap-3" aria-hidden="true">
    <NSkeleton className="size-24 rounded-full" />
    <NSkeleton className="h-4 w-1/2" />
    <NSkeleton className="h-3 w-1/3" />
    <div className="mt-2 flex gap-4">
      {Array.from({ length: 4 }, (_, index) => <NSkeleton key={index} className="size-11 rounded-full" />)}
    </div>
  </div>
);

const digits = (value: string) => value.replace(/\D/g, '');

/** The portrait inside a broken primary ring. */
const Portrait = ({ src, name }: { src: string | null; name: string }) => (
  <div className="relative grid size-32 shrink-0 place-items-center">
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90 text-primary" aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" />
      <circle
        cx="50"
        cy="50"
        r="47"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="58 8 26 8"
      />
    </svg>
    {/* The photo fills the ring, a few pixels inside it. */}
    <NAvatar src={src} fallback={name} size="xl" classNames={{ avatar: 'size-[6.5rem] h-[6.5rem] w-[6.5rem] text-2xl' }} />
  </div>
);

const TeacherInfoCard = ({ overview, onViewDetails, loading, error, onRetry, className }: TeacherInfoCardProps) => {
  const { t } = useTranslation();
  const teacher = overview?.teacher;

  const actions: ContactAction[] = teacher ? [
    { key: 'email', icon: Mail, href: teacher.email ? `mailto:${teacher.email}` : null },
    {
      key: 'map',
      icon: MapPin,
      href: teacher.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(teacher.address)}`
        : null,
      external: true,
    },
    { key: 'call', icon: Phone, href: teacher.phone ? `tel:+${digits(teacher.phone)}` : null },
    {
      key: 'whatsapp',
      icon: MessageCircle,
      href: teacher.phone ? `https://wa.me/${digits(teacher.phone)}` : null,
      external: true,
    },
  ] : [];

  return (
    <NCard
      title={t('dashboard.teacher.info.title')}
      icon={UserRound}
      className={cn('h-full', className)}
      classNames={PROFILE_CARD}
      loading={loading}
      skeleton={<InfoSkeleton />}
      error={error}
      errorText={t('common.feedback.errorMessage')}
      onRetry={onRetry}
    >
      {onViewDetails ? (
        <NCardAction>
          <NButton type="button" variant="link" size="sm" className="h-auto p-0 text-xs font-medium lg:text-sm" onClick={onViewDetails}>
            {t('dashboard.teacher.info.viewDetails')}
          </NButton>
        </NCardAction>
      ) : null}

      {teacher ? (
        <>
          <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
            <Portrait src={teacher.image} name={teacher.name} />
            <p className="mt-2 max-w-full truncate font-semibold text-foreground">{teacher.name}</p>
            {teacher.specialization ? (
              <p className="flex max-w-full items-center gap-1.5 text-sm text-muted-foreground">
                <BookOpen className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{teacher.specialization}</span>
              </p>
            ) : null}
          </div>

          <div className="mx-auto mt-4 flex w-4/5 justify-center gap-4 border-t border-border/70 pt-4">
            {actions.map(({ key, icon: Icon, href, external }) => {
              const label = t(`dashboard.teacher.info.actions.${key}`);
              const className = 'size-11 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary';
              return (
                <SimpleTooltip key={key} content={href ? label : t('dashboard.teacher.info.actions.unavailable')}>
                  {href ? (
                    <NButton asChild variant="ghost" size="icon" className={className}>
                      <a href={href} aria-label={label} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                        <Icon className="size-5" aria-hidden="true" />
                      </a>
                    </NButton>
                  ) : (
                    // A disabled button takes no pointer events, so the span
                    // keeps the tooltip saying why.
                    <span tabIndex={0} aria-label={label}>
                      <NButton type="button" variant="ghost" size="icon" disabled className={className}>
                        <Icon className="size-5" aria-hidden="true" />
                      </NButton>
                    </span>
                  )}
                </SimpleTooltip>
              );
            })}
          </div>
        </>
      ) : null}
    </NCard>
  );
};

export default TeacherInfoCard;
