import type { BadgeColor } from 'najm-kit';

export const AUDIENCE_COLORS: Record<string, BadgeColor> = {
  all: 'primary',
  students: 'info',
  teachers: 'success',
  parents: 'warning',
  class: 'primary',
};

export const STATUS_COLORS: Record<'draft' | 'published', BadgeColor> = {
  draft: 'warning',
  published: 'success',
};
