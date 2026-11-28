'use client';

import type { ComponentProps, ReactNode } from 'react';
import { BookOpen, CalendarClock, School, Star, UserRound, type LucideIcon } from 'lucide-react';
import { cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { BehaviorRewardCategory, BehaviorRewardType } from '@sms/contracts';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { rewardIcon } from '../behaviorRewardConstants';
import { CategoryTile, PointsMark } from './BehaviorRewardTags';
import { BehaviorRewardStudentIdentity } from './BehaviorRewardStudentIdentity';
import { RewardCertificateButton } from './RewardCertificatesButton';

export type BehaviorRewardDetail = {
  id: string;
  student?: ComponentProps<typeof BehaviorRewardStudentIdentity>['student'];
  class?: { name?: string | null } | null;
  section?: { name?: string | null } | null;
  subject?: { id?: string | null; name?: string | null } | null;
  category: BehaviorRewardCategory;
  description?: string | null;
  rewardType: BehaviorRewardType;
  points?: number | null;
  rewardNote?: string | null;
  certificatePlace?: string | null;
  awardedByUser?: { name?: string | null } | null;
  behaviorAt: string;
  createdAt: string;
  updatedAt: string;
};

function RewardDetailField({ icon: Icon, label, children, className }: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid min-w-0 content-start gap-1.5 rounded-xl border border-border/70 bg-muted/35 p-2.5 sm:p-3', className)}>
      <dt className="flex items-center gap-1.5 text-xs leading-tight text-muted-foreground">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="wrap-anywhere">{label}</span>
      </dt>
      <dd className="text-sm leading-snug font-semibold wrap-anywhere">{children}</dd>
    </div>
  );
}

export default function BehaviorRewardDetails({ behaviorReward: reward, canPrint }: {
  behaviorReward: BehaviorRewardDetail;
  canPrint: boolean;
}) {
  const { t } = useTranslation();
  const { displayDateTime } = useSchoolFormat();
  const description = reward.description?.trim();
  const rewardNote = reward.rewardNote?.trim();

  return (
    <article className="grid min-w-0 gap-3.5">
      <div className="min-w-0 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
        <BehaviorRewardStudentIdentity student={reward.student} updatedAt={reward.updatedAt} size="lg" />
      </div>
      {canPrint && <RewardCertificateButton reward={reward} />}

      <section className="grid gap-2.5 rounded-xl border border-border/70 bg-card p-3">
        <h3 className="flex min-w-0 items-center gap-2.5 text-sm font-semibold">
          <CategoryTile category={reward.category} />
          <span className="wrap-anywhere">{t(`behaviorRewards.categories.${reward.category}`)}</span>
        </h3>
        {description && <p dir="auto" className="text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">{description}</p>}
      </section>

      <dl className="grid grid-cols-2 gap-2.5">
        <RewardDetailField icon={rewardIcon(reward.rewardType)} label={t('behaviorRewards.table.reward')}>
          {t(`behaviorRewards.rewardTypes.${reward.rewardType}`)}
          {reward.rewardType === 'certificate' && reward.certificatePlace
            && <> · {t(`behaviorRewards.certificates.${reward.certificatePlace}`)}</>}
        </RewardDetailField>
        <RewardDetailField icon={Star} label={t('behaviorRewards.table.points')}>
          <PointsMark points={reward.points} />
        </RewardDetailField>
        <RewardDetailField icon={School} label={t('behaviorRewards.table.classSection')}>
          <bdi>{reward.class?.name || '—'}</bdi> / <bdi>{reward.section?.name || '—'}</bdi>
        </RewardDetailField>
        <RewardDetailField icon={CalendarClock} label={t('behaviorRewards.table.behaviorDate')}>
          <time dateTime={reward.behaviorAt} className="tabular-nums"><bdi>{displayDateTime(reward.behaviorAt)}</bdi></time>
        </RewardDetailField>
        <RewardDetailField icon={BookOpen} label={t('behaviorRewards.table.subject')}>
          <bdi>{reward.subject?.name || t('behaviorRewards.filters.noSubject')}</bdi>
        </RewardDetailField>
        <RewardDetailField icon={UserRound} label={t('behaviorRewards.table.awardedBy')}>
          <bdi>{reward.awardedByUser?.name || '—'}</bdi>
        </RewardDetailField>
      </dl>

      {rewardNote && (
        <section className="grid gap-1 rounded-xl border border-border/70 bg-card p-3">
          <h3 className="text-sm font-semibold">{t('behaviorRewards.form.rewardNote')}</h3>
          <p dir="auto" className="text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">{rewardNote}</p>
        </section>
      )}

      <dl className="grid grid-cols-2 gap-2.5 border-t border-border/70 px-1 pt-3 text-xs text-muted-foreground">
        <div className="min-w-0 space-y-1">
          <dt>{t('behaviorRewards.table.createdAt')}</dt>
          <dd className="wrap-anywhere tabular-nums"><time dateTime={reward.createdAt}><bdi>{displayDateTime(reward.createdAt)}</bdi></time></dd>
        </div>
        <div className="min-w-0 space-y-1">
          <dt>{t('behaviorRewards.table.updatedAt')}</dt>
          <dd className="wrap-anywhere tabular-nums"><time dateTime={reward.updatedAt}><bdi>{displayDateTime(reward.updatedAt)}</bdi></time></dd>
        </div>
      </dl>
    </article>
  );
}
