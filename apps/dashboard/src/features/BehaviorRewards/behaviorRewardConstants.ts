export const BEHAVIOR_REWARD_CATEGORIES = [
  'academic_effort',
  'improvement',
  'respect',
  'helpfulness',
  'leadership',
  'teamwork',
  'responsibility',
  'community_service',
  'excellent_attendance',
  'other',
] as const;

export const BEHAVIOR_RECOGNITION_LEVELS = [
  'appreciation',
  'achievement',
  'excellence',
] as const;

export const BEHAVIOR_REWARD_TYPES = [
  'verbal_praise',
  'written_praise',
  'merit',
  'badge',
  'certificate',
  'privilege',
  'prize',
  'other',
] as const;

export const recognitionClasses: Record<string, string> = {
  appreciation: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-300',
  achievement: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  excellence: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
};

export const rewardClasses: Record<string, string> = {
  verbal_praise: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-300',
  written_praise: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-300',
  merit: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  badge: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  certificate: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  privilege: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  prize: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  other: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
};

export const tagClass = (classes: Record<string, string>, value?: string | null) =>
  `inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[value || ''] || rewardClasses.other}`;

export const toLocalDateTimeInput = (value?: string | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export const formatBehaviorDate = (value?: string | null, language = 'en') => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};
