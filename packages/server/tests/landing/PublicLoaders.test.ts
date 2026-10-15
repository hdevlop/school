import 'reflect-metadata';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { DEFAULT_LANDING_CONTENT } from '@sms/contracts';
import { packagedLandingContent } from '../../src/modules/landing/LandingDefaults';
import { db } from '../../src/database/db';
import { loadSchoolLandingProfile, loadLandingCycles, loadSchoolLandingContent } from '../../src/landing';

// Replace only this object's query entrypoint; no process-wide mock of the DB
// module, which would contaminate unrelated suites in the aggregate runner.
const original = db.select;
const originalFlag = process.env.SCHOOL_SEED_LANDING;
beforeEach(() => { delete process.env.SCHOOL_SEED_LANDING; });
afterEach(() => {
  if (originalFlag === undefined) delete process.env.SCHOOL_SEED_LANDING;
  else process.env.SCHOOL_SEED_LANDING = originalFlag;
});
afterAll(() => { db.select = original; });
function rows(result: unknown[]) {
  const projections: unknown[]=[];
  const query = { from: () => query, where: () => query, orderBy: () => query, limit: () => Promise.resolve(result),
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(result).then(resolve) };
  db.select = ((projection: unknown) => { projections.push(projection); return query; }) as typeof db.select;
  return projections;
}
describe('public landing loaders', () => {
  it('reads only the seven public profile columns, even when a settings row exists', async () => {
    const profile={schoolName:'School',schoolAddress:null,schoolAddressLatitude:null,schoolAddressLongitude:null,schoolPhone:null,schoolEmail:null,schoolWebsite:null};
    const projected=rows([profile]);expect(await loadSchoolLandingProfile()).toEqual(profile);
    expect(Object.keys(projected[0] as object).sort()).toEqual(Object.keys(profile).sort());
  });
  it('supports no settings and no cycles on a fresh installation', async () => {
    rows([]);expect(await loadSchoolLandingProfile()).toBeNull();expect(await loadLandingCycles()).toEqual([]);
    expect(await loadSchoolLandingContent()).toEqual(packagedLandingContent);
  });
  it('keeps the explicit blank-installation opt-out unpublished', async () => {
    rows([]); process.env.SCHOOL_SEED_LANDING = 'false';
    expect(await loadSchoolLandingContent()).toEqual(DEFAULT_LANDING_CONTENT);
  });
  it('preserves saved empty and unpublished content instead of replacing it', async () => {
    rows([DEFAULT_LANDING_CONTENT]);
    expect(await loadSchoolLandingContent()).toEqual(DEFAULT_LANDING_CONTENT);
  });
  it('projects cycle identifiers and labels without reading private student records', async () => {
    const cycles=[{id:'primary',name:'Primary',labels:{fr:'Primaire'}}];const projected=rows(cycles);
    expect(await loadLandingCycles()).toEqual(cycles);expect(Object.keys(projected[0] as object).sort()).toEqual(['id','labels','name']);
  });
  it('does not hide a database failure behind packaged content', async () => {
    db.select = (() => { throw new Error('Landing read failed'); }) as typeof db.select;
    await expect(loadSchoolLandingContent()).rejects.toThrow('Landing read failed');
  });
});
