import type { BadgeColor } from 'najm-kit';

export const ASSESSMENT_TYPE_COLORS: Record<string, BadgeColor> = {
  quiz: 'info',
  assignment: 'primary',
  project: 'success',
  participation: 'warning',
  test: 'info',
  presentation: 'primary',
};

export const ASSESSMENT_STATUS_COLORS: Record<string, BadgeColor> = {
  scheduled: 'info',
  active: 'warning',
  completed: 'success',
  cancelled: 'neutral',
};
