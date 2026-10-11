import { asc, desc, eq } from 'drizzle-orm';
import { DEFAULT_LANDING_CONTENT, type LandingProfile, type LandingContent } from '@sms/contracts';
import { db } from './database/db';
import { settings } from './modules/settings/settingSchema';
import { cycles } from './modules/cycles/cycleSchema';
import { schoolLanding } from './modules/landing/LandingSchema';

// Explicit projection: public rendering must never expose admin settings.
export async function loadSchoolLandingProfile(): Promise<LandingProfile | null> {
  const [row] = await db.select({ schoolName: settings.schoolName, schoolAddress: settings.schoolAddress,
    schoolAddressLatitude: settings.schoolAddressLatitude, schoolAddressLongitude: settings.schoolAddressLongitude,
    schoolPhone: settings.schoolPhone, schoolEmail: settings.schoolEmail, schoolWebsite: settings.schoolWebsite,
  }).from(settings).orderBy(desc(settings.createdAt)).limit(1);
  return row ?? null;
}
// Cycles and landing content are installation-wide, independent of selected year.
export async function loadLandingCycles() {
  return db.select({ id: cycles.id, name: cycles.name, labels: cycles.labels }).from(cycles)
    .where(eq(cycles.active, true)).orderBy(asc(cycles.sortOrder), asc(cycles.id));
}
export async function loadSchoolLandingContent(): Promise<LandingContent> {
  const [row] = await db.select({ published: schoolLanding.published, stats: schoolLanding.stats,
    testimonials: schoolLanding.testimonials, news: schoolLanding.news, programBlurbs: schoolLanding.programBlurbs,
    programPhotoSlots: schoolLanding.programPhotoSlots, admissionsOpen: schoolLanding.admissionsOpen,
    admissionsYearLabel: schoolLanding.admissionsYearLabel, socialLinks: schoolLanding.socialLinks,
  }).from(schoolLanding).where(eq(schoolLanding.id, 'school')).limit(1);
  return row ?? structuredClone(DEFAULT_LANDING_CONTENT);
}
