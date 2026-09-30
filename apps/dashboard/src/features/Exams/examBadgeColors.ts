import type { BadgeColor } from 'najm-kit';

export const EXAM_TYPE_COLORS: Record<string, BadgeColor> = {
  midterm: 'info',
  final: 'primary',
  standardized: 'warning',
};

export const EXAM_STATUS_COLORS: Record<string, BadgeColor> = {
  scheduled: 'info',
  active: 'warning',
  completed: 'success',
  cancelled: 'neutral',
  rescheduled: 'primary',
};
