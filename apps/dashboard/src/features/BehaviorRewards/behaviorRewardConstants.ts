/**
 * Presentation for the behaviour rewards screens.
 *
 * The category and reward-type tuples that used to head
 * this file were a third copy of values the API owns; they now come from
 * `@sms/contracts` through `config/behaviorRewardOptions.ts`. What is left is
 * genuinely this feature's own: each value's icon and colour, and the date
 * formatting the cards and the form share.
 */
import {
  Award, BadgeCheck, BookOpenCheck, CalendarCheck, Crown, Gift, HandHelping, HeartHandshake, MessageCircleHeart,
  PenLine, School, ScrollText, ShieldCheck, Sparkles, Sprout, Ticket, TrendingUp, Users, type LucideIcon,
} from 'lucide-react';
import type { BehaviorRewardCategory, BehaviorRewardType } from '@sms/contracts';

/** A category's icon, on a tinted tile, and its name in the same colour. */
export type CategoryLook = { icon: LucideIcon; tile: string; text: string };

const look = (icon: LucideIcon, tile: string, text: string): CategoryLook => ({ icon, tile, text });

export const categoryLooks: Record<BehaviorRewardCategory, CategoryLook> = {
  academic_effort: look(BookOpenCheck, 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300', 'text-blue-700 dark:text-blue-300'),
  classwork: look(School, 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300', 'text-sky-700 dark:text-sky-300'),
  improvement: look(TrendingUp, 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300', 'text-emerald-700 dark:text-emerald-300'),
  respect: look(HeartHandshake, 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300', 'text-rose-700 dark:text-rose-300'),
  helpfulness: look(HandHelping, 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300', 'text-orange-700 dark:text-orange-300'),
  leadership: look(Crown, 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300', 'text-violet-700 dark:text-violet-300'),
  teamwork: look(Users, 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300', 'text-cyan-700 dark:text-cyan-300'),
  responsibility: look(ShieldCheck, 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300', 'text-indigo-700 dark:text-indigo-300'),
  community_service: look(Sprout, 'bg-lime-100 text-lime-700 dark:bg-lime-950/60 dark:text-lime-300', 'text-lime-700 dark:text-lime-300'),
  excellent_attendance: look(CalendarCheck, 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300', 'text-teal-700 dark:text-teal-300'),
  other: look(Sparkles, 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', 'text-slate-700 dark:text-slate-300'),
};

export const categoryLook = (value?: string | null) => categoryLooks[value as BehaviorRewardCategory] ?? categoryLooks.other;

/** A reward reads by its icon; the chip stays neutral so the row is not a rainbow of pills. */
export const rewardIcons: Record<BehaviorRewardType, LucideIcon> = {
  verbal_praise: MessageCircleHeart,
  written_praise: PenLine,
  merit: Award,
  badge: BadgeCheck,
  certificate: ScrollText,
  privilege: Ticket,
  prize: Gift,
  other: Sparkles,
};

export const rewardIcon = (value?: string | null) => rewardIcons[value as BehaviorRewardType] ?? Sparkles;

export const toLocalDateTimeInput = (value?: string | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};
