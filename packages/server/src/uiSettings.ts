import { desc } from 'drizzle-orm';

import { db } from './database/db';
import { settings } from './modules/settings/settingSchema';

/**
 * The five School settings the first server render needs.
 *
 * A deliberately narrow read rather than the public settings projection: this
 * runs on every render of the root layout, including anonymous ones, and the
 * rest of that projection is neither needed for the first paint nor safe to
 * widen into by accident.
 */
export interface SchoolUiSettings {
  schoolName: string | null;
  language: string | null;
  theme: string | null;
  timeZone: string | null;
  currency: string | null;
}

/**
 * Reads the School settings row, or `null` when the installation has none yet.
 *
 * Returns raw column values. Every one of them is normalized against the
 * dashboard's typed allowlists before it reaches the provider, so a hand-edited
 * row cannot put an arbitrary locale, class name, time zone, or currency code
 * on the page.
 */
export async function loadSchoolUiSettings(): Promise<SchoolUiSettings | null> {
  const [row] = await db
    .select({
      schoolName: settings.schoolName,
      language: settings.language,
      theme: settings.theme,
      timeZone: settings.timeZone,
      currency: settings.currency,
    })
    .from(settings)
    .orderBy(desc(settings.createdAt))
    .limit(1);

  return row ?? null;
}

/**
 * The active school year's label, or `null` when the installation has no
 * settings row yet. The first server render hands it to the dashboard so
 * screens that need the active year do not wait for the browser to load the
 * public settings first. It is public: the public settings return it too.
 */
export async function loadActiveAcademicYearLabel(): Promise<string | null> {
  const [row] = await db
    .select({ label: settings.currentAcademicYear })
    .from(settings)
    .orderBy(desc(settings.createdAt))
    .limit(1);

  return row?.label ?? null;
}
