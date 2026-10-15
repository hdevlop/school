import { DEFAULT_LANDING_CONTENT, LANDING_PROGRAM_SLOTS, type LandingContent } from '@sms/contracts';
import { landingContentDto } from './LandingDto';
import type { LandingSeedProgram } from './LandingRepository';
import defaults from './data/defaults.json';

// One packaged content source for first deployment, public rendering and editor.
export const packagedLandingContent: LandingContent = {
  ...landingContentDto.parse({ ...defaults.content, programBlurbs: {}, programPhotoSlots: {} }),
  admissionsYearLabel: defaults.content.admissionsYearLabel,
};
export const packagedLandingPrograms: LandingSeedProgram[] = defaults.programs.map((program, index) => ({
  ...program, photoSlot: LANDING_PROGRAM_SLOTS[index],
}));

/** Missing records show the packaged page; an explicit opt-out keeps a blank draft. */
export function defaultLandingContent(flag = process.env.SCHOOL_SEED_LANDING): LandingContent {
  if (flag !== undefined && flag !== '' && flag !== 'true' && flag !== 'false') {
    throw new Error('SCHOOL_SEED_LANDING must be true or false');
  }
  return structuredClone(flag === 'false' ? DEFAULT_LANDING_CONTENT : packagedLandingContent);
}
