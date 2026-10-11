import type { Language } from './enums';

export type LandingText = Record<Language, string>;
export const LANDING_PROGRAM_SLOTS = ['landingProgram1', 'landingProgram2', 'landingProgram3'] as const;
export type LandingProgramSlot = typeof LANDING_PROGRAM_SLOTS[number];
// News card N shows the photo in slot N; the school uploads it like the other landing photos.
export const LANDING_NEWS_SLOTS = ['landingNews1', 'landingNews2', 'landingNews3'] as const;
export const LANDING_NEWS_FALLBACKS = ['/images/landing/news-back-to-school.webp', '/images/landing/news-football.webp', '/images/landing/news-moroccan-heritage.webp'] as const;
export interface LandingNewsItem { date: string; tag: LandingText; title: LandingText; body: LandingText }
export interface LandingContent {
  published: boolean;
  stats: { value: string; label: LandingText }[];
  testimonials: { author: string; quote: LandingText; rating: number }[];
  news: LandingNewsItem[];
  programBlurbs: Record<string, LandingText>;
  programPhotoSlots: Record<string, LandingProgramSlot>;
  admissionsOpen: boolean;
  admissionsYearLabel: string | null;
  socialLinks: { facebook?: string; instagram?: string; youtube?: string; linkedin?: string };
}
export const DEFAULT_LANDING_CONTENT: LandingContent = {
  published: true, stats: [], testimonials: [], news: [], programBlurbs: {}, programPhotoSlots: {},
  admissionsOpen: false, admissionsYearLabel: null, socialLinks: {},
};
export interface LandingProfile {
  schoolName: string; schoolAddress: string | null; schoolAddressLatitude: number | null;
  schoolAddressLongitude: number | null; schoolPhone: string | null; schoolEmail: string | null;
  schoolWebsite: string | null;
}
export interface LandingCycle { id: string; name: string; labels: Record<string, string> | null }
