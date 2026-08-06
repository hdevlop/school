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
