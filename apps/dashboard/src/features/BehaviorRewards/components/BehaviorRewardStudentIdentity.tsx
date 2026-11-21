'use client';

import { NAvatar, cn } from 'najm-kit';
import { accountAvatar } from '@/features/Home/config/accountAvatar';
import { avatarVersion } from '@/lib/avatarVersion';

type RewardStudent = {
  name?: string | null;
  arabicName?: string | null;
  gender?: string | null;
  image?: string | null;
};

export function BehaviorRewardStudentIdentity({ student, updatedAt, description, size = 'sm', className }: {
  student?: RewardStudent | null;
  updatedAt?: string | number | null;
  description?: string | null;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const arabicName = student?.arabicName?.trim();
  const note = description?.trim();
  const gender = student?.gender;

  return (
    <NAvatar
      src={student?.image}
      fallbackSrc={gender === 'F' || gender === 'M' ? accountAvatar('student', gender) : undefined}
      title={student?.name || '—'}
      version={avatarVersion(student?.image, updatedAt)}
      size={size}
      className={className}
      classNames={{
        root: 'min-w-0 gap-2',
        avatar: 'shrink-0',
        title: cn('font-semibold leading-tight', size === 'lg' && 'whitespace-normal wrap-anywhere'),
        meta: 'min-w-0',
      }}
      meta={arabicName || note ? (
        <span className="flex min-w-0 items-baseline gap-1.5">
          {arabicName && (
            <bdi lang="ar" className={cn('min-w-0', note && 'max-w-3/5 shrink-0', size === 'lg' ? 'wrap-anywhere' : 'truncate')} title={arabicName}>
              {arabicName}
            </bdi>
          )}
          {arabicName && note && <span aria-hidden>·</span>}
          {note && (
            <bdi className="min-w-0 truncate" title={note}>
              {note}
            </bdi>
          )}
        </span>
      ) : undefined}
    />
  );
}
