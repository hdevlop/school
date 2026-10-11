import { sql } from 'drizzle-orm';
import { boolean, check, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import type { LandingContent } from '@sms/contracts';
import { timestamps } from '../../database/shared';

export const schoolLanding = pgTable('school_landing', {
  id: text('id').primaryKey().default('school'),
  published: boolean('published').notNull().default(true),
  stats: jsonb('stats').$type<LandingContent['stats']>().notNull().default([]),
  testimonials: jsonb('testimonials').$type<LandingContent['testimonials']>().notNull().default([]),
  news: jsonb('news').$type<LandingContent['news']>().notNull().default([]),
  programBlurbs: jsonb('program_blurbs').$type<LandingContent['programBlurbs']>().notNull().default({}),
  programPhotoSlots: jsonb('program_photo_slots').$type<LandingContent['programPhotoSlots']>().notNull().default({}),
  admissionsOpen: boolean('admissions_open').notNull().default(false),
  admissionsYearLabel: text('admissions_year_label'),
  socialLinks: jsonb('social_links').$type<LandingContent['socialLinks']>().notNull().default({}),
  ...timestamps,
}, table => [check('school_landing_singleton', sql`${table.id} = 'school'`)]);
