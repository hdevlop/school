import 'reflect-metadata';
import { LANDING_PROGRAM_SLOTS, type LandingContent } from '@sms/contracts';
import { db } from './database/db';
import { landingContentDto } from './modules/landing/LandingDto';
import { LandingRepository, type LandingSeedProgram } from './modules/landing/LandingRepository';
import defaults from './modules/landing/data/defaults.json';

export const landingSeedContent: LandingContent = {
  ...landingContentDto.parse({ ...defaults.content, programBlurbs: {}, programPhotoSlots: {} }),
  admissionsYearLabel: defaults.content.admissionsYearLabel,
};
export const landingSeedPrograms: LandingSeedProgram[] = defaults.programs.map((program, index) => ({
  ...program, photoSlot: LANDING_PROGRAM_SLOTS[index],
}));

export async function seedSchoolLanding() {
  const repository = new LandingRepository();
  repository.db = db;
  return repository.seedDefaults(landingSeedContent, landingSeedPrograms);
}
