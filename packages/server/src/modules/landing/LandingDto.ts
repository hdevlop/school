import { z } from 'zod';
import { LANGUAGE_VALUES, LANDING_NEWS_SLOTS, LANDING_PROGRAM_SLOTS } from '@sms/contracts';

const translated = (max: number) => z.record(z.enum(LANGUAGE_VALUES), z.string().max(max));
const socialUrl = (hosts: string[]) => z.string().url().refine(value => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password && hosts.includes(url.hostname);
}, 'publicPage.errors.socialUrl');
export const landingContentDto = z.object({
  published: z.boolean(),
  stats: z.array(z.object({ value: z.string().min(1).max(12), label: translated(80) })).max(4),
  testimonials: z.array(z.object({ author: z.string().min(2).max(100), quote: translated(600), rating: z.number().int().min(1).max(5) })).max(3),
  news: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => !Number.isNaN(Date.parse(value))),
    tag: translated(30), title: translated(120), body: translated(300) })).max(LANDING_NEWS_SLOTS.length),
  programBlurbs: z.record(z.string().min(1), translated(200)),
  programPhotoSlots: z.record(z.string().min(1), z.enum(LANDING_PROGRAM_SLOTS)),
  admissionsOpen: z.boolean(), admissionsYearLabel: z.string().max(40).nullable(),
  socialLinks: z.object({ facebook: socialUrl(['facebook.com', 'www.facebook.com']).optional(),
    instagram: socialUrl(['instagram.com', 'www.instagram.com']).optional(),
    youtube: socialUrl(['youtube.com', 'www.youtube.com', 'youtu.be']).optional(),
    linkedin: socialUrl(['linkedin.com', 'www.linkedin.com']).optional() }),
});
