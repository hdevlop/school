'use client';

import { NAvatar } from 'najm-kit';
import { Label } from 'najm-kit';
import { getAvatarFallback } from '@/lib/avatar';
import type { RosterStatus } from '../hooks/useAttendanceRoster';
import RosterMarks from './RosterMarks';

interface RosterCardProps {
  data: any;
  getStatus: (id: string) => RosterStatus;
  setStatus: (id: string, status: RosterStatus) => void;
  /** The line under the name: a student's code and class, a staff member's role. */
  detail?: string;
  avatarSrc?: string | null;
  classNames?: { avatar?: any };
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
  setStatus,
  detail,
  avatarSrc,
  classNames,
}: RosterCardProps) {
  if (!data) return null;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <NAvatar
          src={avatarSrc ?? data.image}
          fallback={getAvatarFallback(data.name)}
          size="lg"
          version={data.updatedAt}
          classNames={classNames?.avatar}
        />
        <div className="min-w-0 flex-1">
          <Label className="block truncate text-md font-bold">{data.name}</Label>
          {detail && <span className="block truncate text-xs text-muted-foreground">{detail}</span>}
        </div>
      </div>

      <RosterMarks
        current={getStatus(data.id)}
        onSelect={(status) => setStatus(data.id, status)}
      />
    </div>
  );
}
