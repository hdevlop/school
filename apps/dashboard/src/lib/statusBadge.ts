import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  PauseCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import type { BadgeColor } from 'najm-kit'
import translations from '@sms/server/locales'

export const STATUS_COLOR_MAP: Record<string, BadgeColor> = {
  active: 'success',
  approved: 'success',
  completed: 'success',
  confirmed: 'success',
  paid: 'success',
  present: 'success',
  published: 'success',
  success: 'success',

  pending: 'warning',
  partial: 'warning',
  partially_paid: 'warning',
  late: 'warning',
  warning: 'warning',

  processing: 'info',
  in_progress: 'info',
  scheduled: 'info',
  draft: 'info',
  info: 'info',

  inactive: 'neutral',
  cancelled: 'neutral',
  absent: 'neutral',
  archived: 'neutral',

  failed: 'destructive',
  overdue: 'destructive',
  rejected: 'destructive',
  unpaid: 'destructive',
  error: 'destructive',

  exam: 'primary',
  quiz: 'secondary',
  homework: 'accent',
  assignment: 'info',
  project: 'warning',

  students: 'primary',
  parents: 'secondary',
  teachers: 'accent',
  all: 'info',
}

export const STATUS_ICON_MAP = {
  active: CheckCircle2,
  approved: CheckCircle2,
  completed: CheckCircle2,
  confirmed: CheckCircle2,
  paid: CheckCircle2,
  present: CheckCircle2,
  published: CheckCircle2,
  success: CheckCircle2,

  pending: Clock,
  partial: Clock,
  partially_paid: Clock,
  late: Clock,
  warning: AlertTriangle,

  processing: Loader2,
  in_progress: Loader2,
  scheduled: Clock,
  draft: PauseCircle,
  info: AlertCircle,

  inactive: PauseCircle,
  cancelled: XCircle,
  absent: XCircle,
  archived: PauseCircle,

  failed: XCircle,
  overdue: AlertTriangle,
  rejected: XCircle,
  unpaid: AlertTriangle,
  error: XCircle,

  approved_by_admin: ShieldCheck,
}

/**
 * Every status token this app renders, pointed at its entry in the shared
 * `status.*` catalog.
 *
 * `NBadge` resolves a status to its text in this order: an explicit `label`, a
 * string child, `statusLabelKeys` through the provider's translator, and only
 * then a humanized form of the raw token. Nearly thirty badge renders across
 * School passed none of the first three, so every one of them fell through to
 * the humanized English token — "All" where the catalog says "Everyone", and
 * English statuses on a French or Arabic screen.
 *
 * Registering the map once on the provider fixes all of them at their source
 * rather than at twenty-nine call sites, and a token with no catalog entry
 * still falls through to the humanized form exactly as before.
 *
 * The catalog is keyed in camelCase (`onLeave`) while the database stores
 * snake_case (`on_leave`), and `NBadge` normalizes only spaces and hyphens —
 * so both spellings are registered.
 */
export const STATUS_LABEL_KEYS: Record<string, string> = (() => {
  const toSnakeCase = (key: string) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  const statusCatalog = (translations as Record<string, any>)?.en?.status ?? {};

  const keys: Record<string, string> = {};
  for (const token of Object.keys(statusCatalog)) {
    keys[token] = `status.${token}`;
    keys[toSnakeCase(token)] = `status.${token}`;
  }
  return keys;
})();
