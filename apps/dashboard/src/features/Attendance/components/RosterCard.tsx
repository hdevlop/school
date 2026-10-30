'use client';

import { NAvatar } from 'najm-kit';
import type { ReactNode } from 'react';
import { Label } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { RosterStatus, RosterMark } from '../hooks/useAttendanceRoster';
import RosterMarks from './RosterMarks';
import { avatarVersion } from '@/lib/avatarVersion';

interface RosterCardProps {
  readOnly?: boolean;
  data: any;
  getStatus: (id: string) => RosterMark;
  setStatus: (id: string, status: RosterStatus) => void;
  /** The line under the name: a student's code and class, a staff member's role. */
  detail?: string;
  avatarSrc?: string | null;
  classNames?: { avatar?: any };
  children?: ReactNode;
}

/**
 * One person to mark, on a screen too narrow for the register's table.
 *
 * The register has nine columns and neither scrolls nor wraps, so below
 * `NTable`'s card breakpoint every column was squeezed to a few dozen pixels —
 * a name rendered about twenty pixels wide, and the three marks could not fit
 * their cell. This is the same roster row given room: who it is, and the marks,
 * at the size a thumb needs.
 */
export default function RosterCard({
  data,
  getStatus,
  readOnly = false,
  setStatus,
  detail,
  avatarSrc,
  classNames,
  children,
}: RosterCardProps) {
  const { t } = useTranslation();
  if (!data) return null;

  const current = getStatus(data.id);
  const detailLine = [detail, current === 'unmarked' && t('attendance.roster.unmarked')].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <NAvatar
          src={avatarSrc ?? data.image}
          fallback={data.name}
          size="md"
          version={avatarVersion(avatarSrc ?? data.image, data.updatedAt)}
          classNames={classNames?.avatar}
        />
        <div className="min-w-0 flex-1">
          <Label className="block truncate text-md font-bold">{data.name}</Label>
          {detailLine && <span className="block truncate text-xs text-muted-foreground">{detailLine}</span>}
        </div>
        <div className="shrink-0">
          <RosterMarks
            current={current}
            disabled={readOnly}
            showHint={false}
            onSelect={(status) => setStatus(data.id, status)}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
