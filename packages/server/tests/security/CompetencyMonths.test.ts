import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { catalogInMonths } from '@sms/contracts';
import { CompetencyService } from '../../src/modules/competencies/CompetencyService';
import { CompetencyValidator } from '../../src/modules/competencies/CompetencyValidator';
import { updateCompetencyDto } from '../../src/modules/competencies/CompetencyDto';
import { withEnglishMessages } from '../support/englishMessages';

const YEAR = { id: 'year-1', label: '2026-2027', reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31' };
const TEACHER = { id: 'teacher-user', role: 'teacher' };

type Span = { fromMonth: string | null; untilMonth: string | null };
type Domain = Span & { id: string; teacherAssignmentId: string; name: string; altName: string | null; position: number };
type Item = Span & { id: string; domainId: string; name: string; altName: string | null; position: number };
type Level = { competencyId: string; studentId: string; month: string; level: string };

const overlaps = (row: Span, span: Span) =>
  (!span.fromMonth || !row.untilMonth || row.untilMonth >= span.fromMonth)
  && (!span.untilMonth || !row.fromMonth || row.fromMonth <= span.untilMonth);
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** One class and subject's list and levels in memory, behind the repositories' methods the service calls. */
function school() {
  let next = 0;
  const domains: Domain[] = [];
  const items: Item[] = [];
  const levels: Level[] = [];
  const catalog = {
    findAssignment: async () => ({ id: 'a1', sectionId: 's1', subjectId: 'math', teacherUserId: TEACHER.id }),
    findDomain: async (id: string) => domains.find((domain) => domain.id === id),
    findCompetency: async (id: string) => {
      const item = items.find((row) => row.id === id);
      const domain = item && domains.find((row) => row.id === item.domainId);
      return item && domain && { ...item, teacherAssignmentId: domain.teacherAssignmentId, domainFromMonth: domain.fromMonth, domainUntilMonth: domain.untilMonth };
    },
    competenciesOfDomain: async (domainId: string) => items.filter((item) => item.domainId === domainId),
    countDomains: async (assignmentId: string, month?: string) =>
      domains.filter((domain) => domain.teacherAssignmentId === assignmentId && (!month || overlaps(domain, { fromMonth: month, untilMonth: null }))).length,
    countCompetencies: async (domainId: string, month?: string) =>
      items.filter((item) => item.domainId === domainId && (!month || overlaps(item, { fromMonth: month, untilMonth: null }))).length,
    nextDomainPosition: async () => domains.length,
    nextCompetencyPosition: async (domainId: string) => items.filter((item) => item.domainId === domainId).length,
    domainNameTaken: async (assignmentId: string, name: string, span: Span, excludeId?: string) =>
      domains.some((domain) => domain.teacherAssignmentId === assignmentId && same(domain.name, name) && overlaps(domain, span) && domain.id !== excludeId),
    competencyNameTaken: async (domainId: string, name: string, span: Span, excludeId?: string) =>
      items.some((item) => item.domainId === domainId && same(item.name, name) && overlaps(item, span) && item.id !== excludeId),
    createDomain: async (data: Omit<Domain, 'id' | 'fromMonth' | 'untilMonth'> & Partial<Span>) => {
      const row = { fromMonth: null, untilMonth: null, ...data, id: `d${++next}` };
      domains.push(row);
      return { id: row.id };
    },
    createCompetency: async (data: Omit<Item, 'id' | 'fromMonth' | 'untilMonth'> & Partial<Span>) => {
      const row = { fromMonth: null, untilMonth: null, ...data, id: `c${++next}` };
      items.push(row);
      return { id: row.id };
    },
    updateDomain: async (id: string, data: Partial<Domain>) => { Object.assign(domains.find((row) => row.id === id)!, data); return { id }; },
    updateCompetency: async (id: string, data: Partial<Item>) => { Object.assign(items.find((row) => row.id === id)!, data); return { id }; },
    deleteDomain: async (id: string) => {
      for (const item of items.filter((row) => row.domainId === id)) await catalog.deleteCompetency(item.id);
      domains.splice(domains.findIndex((row) => row.id === id), 1);
      return { id };
    },
    deleteCompetency: async (id: string) => {
      items.splice(items.findIndex((row) => row.id === id), 1);
      for (let index = levels.length - 1; index >= 0; index--) if (levels[index].competencyId === id) levels.splice(index, 1);
      return { id };
    },
    // In position order, then created order, as the repository reads it.
    catalog: async () => domains.map((domain) => ({
      ...domain, competencies: items.filter((item) => item.domainId === domain.id).toSorted((a, b) => a.position - b.position),
    })),
  };
  const evaluations = {
    placedDuring: async () => true,
    set: async (data: Level) => { levels.push(data); return data; },
    removeFrom: async (competencyId: string, month: string) => {
      for (let index = levels.length - 1; index >= 0; index--) {
        if (levels[index].competencyId === competencyId && levels[index].month >= month) levels.splice(index, 1);
      }
    },
    moveFrom: async (from: string, to: string, month: string) => {
      for (const level of levels) if (level.competencyId === from && level.month >= month) level.competencyId = to;
    },
  };
  const validator = withEnglishMessages(new CompetencyValidator(catalog as any, evaluations as any));
  Object.defineProperty(validator, 'year', { value: YEAR });
  const service = new CompetencyService(catalog as any, evaluations as any, {} as any, validator, {} as any);
  const rate = (competencyId: string, month: string, studentId = 'p1') =>
    service.setEvaluation({ competencyId, studentId, month, level: 'advanced' }, TEACHER);
  const listIn = async (month: string) => catalogInMonths(await catalog.catalog(), [month])
    .map((domain) => [domain.name, domain.competencies.map((item) => item.name)]);
  return { service, domains, items, levels, rate, listIn };
}

const refusal = async (run: () => unknown) => {
  try { await run(); } catch (error: any) { return { status: error.status ?? error.statusCode, message: error.message }; }
  return null;
};

/** A Maths list built in September: Nombres with Lire and Longueurs. */
async function september() {
  const world = school();
  const domain = await world.service.createDomain({ teacherAssignmentId: 'a1', name: 'Nombres', altName: null, month: '2026-09' }, TEACHER);
  const lire = await world.service.createCompetency({ domainId: domain.id, name: 'Lire', altName: null, month: '2026-09' }, TEACHER);
  const longueurs = await world.service.createCompetency({ domainId: domain.id, name: 'Longueurs', altName: null, month: '2026-09' }, TEACHER);
  return { ...world, domain, lire, longueurs };
}

describe('a competency list month by month', () => {
  it('follows a list built in the year\'s first month in every month, and one added later from its month on', async () => {
    const { service, domain, items, listIn } = await september();
    expect(items.map((item) => item.fromMonth)).toEqual([null, null]);
    await service.createCompetency({ domainId: domain.id, name: 'Problèmes', altName: null, month: '2026-11' }, TEACHER);
    expect(await listIn('2026-09')).toEqual([['Nombres', ['Lire', 'Longueurs']]]);
    expect(await listIn('2026-11')).toEqual([['Nombres', ['Lire', 'Longueurs', 'Problèmes']]]);
    expect(await listIn('2027-03')).toEqual([['Nombres', ['Lire', 'Longueurs', 'Problèmes']]]);
  });

  it('removes a competency from the month on, keeping it and its levels in the months before', async () => {
    const { service, longueurs, levels, rate, listIn } = await september();
    await rate(longueurs.id, '2026-09');
    await rate(longueurs.id, '2026-11');
    await service.deleteCompetency(longueurs.id, '2026-11', TEACHER);
    expect(await listIn('2026-10')).toEqual([['Nombres', ['Lire', 'Longueurs']]]);
    expect(await listIn('2026-11')).toEqual([['Nombres', ['Lire']]]);
    expect(levels.map((level) => level.month)).toEqual(['2026-09']);
  });

  it('deletes outright a competency removed in the month it started, with its levels', async () => {
    const { service, domain, items, levels, rate } = await september();
    const added = await service.createCompetency({ domainId: domain.id, name: 'Problèmes', altName: null, month: '2026-11' }, TEACHER);
    await rate(added.id, '2026-11');
    await service.deleteCompetency(added.id, '2026-11', TEACHER);
    expect(items.map((item) => item.name)).toEqual(['Lire', 'Longueurs']);
    expect(levels).toEqual([]);
  });

  it('frees a name from the month after the competency holding it ended', async () => {
    const { service, domain, longueurs } = await september();
    expect((await refusal(() => service.createCompetency({ domainId: domain.id, name: 'longueurs ', altName: null, month: '2026-11' }, TEACHER)))?.status).toBe(409);
    await service.deleteCompetency(longueurs.id, '2026-11', TEACHER);
    expect(await refusal(() => service.createCompetency({ domainId: domain.id, name: 'Longueurs', altName: null, month: '2026-11' }, TEACHER))).toBeNull();
  });

  it('replaces a rated competency from the month on: earlier months keep the old name and levels, the new one takes the rest', async () => {
    const { service, lire, levels, rate, listIn } = await september();
    await rate(lire.id, '2026-09');
    await rate(lire.id, '2026-11');
    const created = await service.updateCompetency(lire.id, { name: 'Lire les grands nombres', month: '2026-11', scope: 'fromMonth' }, TEACHER);
    expect(created.id).not.toBe(lire.id);
    expect(await listIn('2026-10')).toEqual([['Nombres', ['Lire', 'Longueurs']]]);
    expect(await listIn('2026-11')).toEqual([['Nombres', ['Lire les grands nombres', 'Longueurs']]]);
    expect(levels.map((level) => [level.competencyId, level.month])).toEqual([[lire.id, '2026-09'], [created.id, '2026-11']]);
  });

  it('corrects a name in every month when the rename is a spelling fix, or the competency started that month', async () => {
    const { service, lire, rate, listIn } = await september();
    await rate(lire.id, '2026-09');
    await service.updateCompetency(lire.id, { name: 'Lire et écrire', month: '2026-11', scope: 'all' }, TEACHER);
    expect(await listIn('2026-09')).toEqual([['Nombres', ['Lire et écrire', 'Longueurs']]]);
    // Nothing before September: "from September" is the same competency, renamed.
    const kept = await service.updateCompetency(lire.id, { name: 'Lire', month: '2026-09', scope: 'fromMonth' }, TEACHER);
    expect(kept.id).toBe(lire.id);
  });

  it('removes a sub-domain from the month on, its competencies with it, and ends it there', async () => {
    const { service, domain, domains, lire, rate, listIn } = await september();
    await rate(lire.id, '2026-09');
    await service.deleteDomain(domain.id, '2026-11', TEACHER);
    expect(await listIn('2026-10')).toEqual([['Nombres', ['Lire', 'Longueurs']]]);
    expect(await listIn('2026-11')).toEqual([]);
    expect(domains[0].untilMonth).toBe('2026-10');
  });

  it('deletes a sub-domain added in the month it is removed in', async () => {
    const { service, domains } = await september();
    const added = await service.createDomain({ teacherAssignmentId: 'a1', name: 'Géométrie', altName: null, month: '2026-11' }, TEACHER);
    await service.createCompetency({ domainId: added.id, name: 'Droites', altName: null, month: '2026-11' }, TEACHER);
    await service.deleteDomain(added.id, '2026-11', TEACHER);
    expect(domains.map((domain) => domain.name)).toEqual(['Nombres']);
  });

  it('sets a level only in a month the competency is followed in, and changes only what that month shows', async () => {
    const { service, domain, longueurs, rate } = await september();
    await service.deleteCompetency(longueurs.id, '2026-11', TEACHER);
    expect((await refusal(() => rate(longueurs.id, '2026-12')))?.message).toBe('This is not followed in this month');
    expect(await refusal(() => rate(longueurs.id, '2026-10'))).toBeNull();
    const added = await service.createCompetency({ domainId: domain.id, name: 'Problèmes', altName: null, month: '2026-11' }, TEACHER);
    expect((await refusal(() => rate(added.id, '2026-10')))?.status).toBe(409);
    expect((await refusal(() => service.deleteCompetency(added.id, '2026-10', TEACHER)))?.status).toBe(409);
  });

  it('asks a month of a rename that starts from one', () => {
    expect(updateCompetencyDto.safeParse({ name: 'x', scope: 'fromMonth' }).success).toBe(false);
    expect(updateCompetencyDto.safeParse({ name: 'x', scope: 'fromMonth', month: '2026-11' }).success).toBe(true);
    expect(updateCompetencyDto.safeParse({ position: 2 }).success).toBe(true);
  });
});
