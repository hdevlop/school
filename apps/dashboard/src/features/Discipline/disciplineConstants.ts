import type { BadgeColor } from 'najm-kit';

export const DISCIPLINE_CATEGORIES = [
  'classroom_disruption', 'disrespect', 'bullying', 'fighting', 'cheating',
  'vandalism', 'uniform_violation', 'device_misuse', 'prohibited_item', 'other',
] as const;
export const DISCIPLINE_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export const DISCIPLINE_STATUSES = ['open', 'resolved'] as const;
export const DISCIPLINE_ACTIONS = [
  'verbal_warning', 'written_warning', 'detention', 'counseling',
  'parent_meeting', 'suspension', 'other',
] as const;

export const SEVERITY_COLORS: Record<string, BadgeColor> = {
  low: 'neutral', medium: 'warning', high: 'warning', critical: 'destructive',
};
export const STATUS_COLORS: Record<string, BadgeColor> = {
  open: 'warning', resolved: 'success',
};
export const severityClassName = (severity: string) => severity === 'high'
  ? 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300'
  : undefined;
export const ACTION_COLORS: Record<string, BadgeColor> = {
  verbal_warning: 'warning', written_warning: 'warning', detention: 'info',
  counseling: 'info', parent_meeting: 'info', suspension: 'destructive', other: 'neutral',
};

export type DisciplineIncident = {
  id: string;
  studentId: string;
  classId: string;
  sectionId: string;
  reportedBy: string;
  incidentAt: string;
  category: typeof DISCIPLINE_CATEGORIES[number];
  severity: typeof DISCIPLINE_SEVERITIES[number];
  status: typeof DISCIPLINE_STATUSES[number];
  location?: string | null;
  description: string;
  actionType?: typeof DISCIPLINE_ACTIONS[number] | null;
  actionNote?: string | null;
  resolutionNote?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  student?: { id: string; name: string; studentCode: string; image?: string | null };
  class?: { id: string; name: string };
  section?: { id: string; name: string };
  reporter?: { id: string; name?: string | null; email?: string | null; image?: string | null };
  resolver?: { id?: string | null; name?: string | null; email?: string | null; image?: string | null };
};

export const formatDisciplineDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};
