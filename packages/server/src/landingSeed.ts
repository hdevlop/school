import 'reflect-metadata';
import { db } from './database/db';
import { LandingRepository } from './modules/landing/LandingRepository';
import { packagedLandingContent, packagedLandingPrograms } from './modules/landing/LandingDefaults';

export { packagedLandingContent as landingSeedContent, packagedLandingPrograms as landingSeedPrograms };

export async function seedSchoolLanding() {
  const repository = new LandingRepository();
  repository.db = db;
  return repository.seedDefaults(packagedLandingContent, packagedLandingPrograms);
}
