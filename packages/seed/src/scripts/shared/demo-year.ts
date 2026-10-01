import { defaultSchoolYearCalendar } from '@sms/contracts/academic-years';
import type { AcademicYearRepository, AcademicYearService, SettingsService } from '@sms/server/modules/seed';
import { getSeedAcademicYear } from './academic-year';
import { schoolSeedData, seedAcademicYear } from './school-seed-data';

/**
 * Install settings once; adding a demo year never activates it. A fresh
 * install makes `installYear` active: today's teaching year, or the oldest
 * year of a history seed, which later years then succeed.
 */
export async function prepareDemoYear(
  settings: Pick<SettingsService, 'getAdminSettings' | 'create'>,
  years: Pick<AcademicYearService, 'list' | 'create' | 'verifyCalendar'>,
  repository: Pick<AcademicYearRepository, 'setStatus'>,
  academicYear = seedAcademicYear,
  installYear = getSeedAcademicYear(),
) {
  const installed = !await settings.getAdminSettings();
  if (installed) {
    await settings.create({ ...schoolSeedData.settingsData, currentAcademicYear: installYear });
  }
  const registered = await years.list('admin');
  if (installed && registered.activeAcademicYearId) {
    await years.verifyCalendar(registered.activeAcademicYearId, 'Verified synthetic calendar from the demo school settings', 'school-seed');
  }
  let selected = registered.years.find((year) => year?.label === academicYear);
  if (!selected) {
    selected = await years.create({
      label: academicYear,
      ...defaultSchoolYearCalendar(academicYear),
      provenance: 'verified',
      provenanceNote: 'Synthetic September-June calendar explicitly selected by the demo seed CLI',
    }, 'school-seed');
    // Trusted fixture setup opens the new year without an application activation.
    await repository.setStatus(selected!.id, 'open', 'school-seed');
  } else {
    if (selected.status === 'draft') throw new Error('The selected year is a draft; open it before adding demo people');
    if (selected.provenance !== 'verified' && !installed) {
      throw new Error('Verify the selected academic year calendar before adding demo data');
    }
    const calendar = defaultSchoolYearCalendar(academicYear);
    if (Object.entries(calendar).some(([key, value]) => selected![key as keyof typeof selected] !== value)) {
      throw new Error('Demo data requires a September-June calendar with the standard reporting interval');
    }
  }
  return selected!.id;
}
