import 'reflect-metadata';
import { afterAll, describe, expect, it } from 'bun:test';
import { db } from '../../src/database/db';
import { loadSchoolLandingProfile, loadLandingCycles, loadSchoolLandingContent } from '../../src/landing';

// Replace only this object's query entrypoint; no process-wide mock of the DB
// module, which would contaminate unrelated suites in the aggregate runner.
const original = db.select;
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
    const content=await loadSchoolLandingContent();expect(content.stats).toEqual([]);expect(content.published).toBe(true);
  });
  it('projects cycle identifiers and labels without reading private student records', async () => {
    const cycles=[{id:'primary',name:'Primary',labels:{fr:'Primaire'}}];const projected=rows(cycles);
    expect(await loadLandingCycles()).toEqual(cycles);expect(Object.keys(projected[0] as object).sort()).toEqual(['id','labels','name']);
  });
});
