import { describe, expect, it } from 'bun:test';
import { catalogInMonths, evaluationsFrom, inMonth, previousMonth, ratedBefore, type CompetencyDomain } from '../src/competencies';

const item = (id: string, fromMonth: string | null, untilMonth: string | null) =>
  ({ id, domainId: 'd', name: id, altName: null, position: 0, fromMonth, untilMonth });
const domain = (id: string, fromMonth: string | null, untilMonth: string | null, competencies: ReturnType<typeof item>[]): CompetencyDomain =>
  ({ id, teacherAssignmentId: 'a', name: id, altName: null, position: 0, fromMonth, untilMonth, competencies });

describe('a competency list in a month', () => {
  it('follows a span from its first month to its last, both included; null is open', () => {
    expect(inMonth({ fromMonth: null, untilMonth: null }, '2027-06')).toBe(true);
    expect(inMonth({ fromMonth: '2026-11', untilMonth: null }, '2026-10')).toBe(false);
    expect(inMonth({ fromMonth: '2026-11', untilMonth: null }, '2026-11')).toBe(true);
    expect(inMonth({ fromMonth: null, untilMonth: '2026-10' }, '2026-10')).toBe(true);
    expect(inMonth({ fromMonth: null, untilMonth: '2026-10' }, '2026-11')).toBe(false);
  });

  it('steps back a month across the new year', () => {
    expect(previousMonth('2027-01')).toBe('2026-12');
    expect(previousMonth('2026-11')).toBe('2026-10');
  });

  it('keeps the sub-domains and competencies followed in the months, a run of months keeping any followed in one', () => {
    const year = [
      domain('Nombres', null, null, [item('Lire', null, null), item('Longueurs', null, '2026-10'), item('Problèmes', '2026-11', null)]),
      domain('Géométrie', '2026-12', null, [item('Droites', '2026-12', null)]),
    ];
    const names = (list: CompetencyDomain[]) => list.map((row) => [row.name, row.competencies.map((competency) => competency.name)]);
    expect(names(catalogInMonths(year, ['2026-09']))).toEqual([['Nombres', ['Lire', 'Longueurs']]]);
    expect(names(catalogInMonths(year, ['2026-11']))).toEqual([['Nombres', ['Lire', 'Problèmes']]]);
    expect(names(catalogInMonths(year, ['2026-09', '2026-10', '2026-11']))).toEqual([['Nombres', ['Lire', 'Longueurs', 'Problèmes']]]);
    expect(names(catalogInMonths(year, ['2026-12']))).toEqual([['Nombres', ['Lire', 'Problèmes']], ['Géométrie', ['Droites']]]);
  });

  it('counts the levels a removal from a month loses, and tells whether earlier months keep some', () => {
    const rated = { evaluationsByMonth: { '2026-09': 20, '2026-11': 18, '2026-12': 3 } };
    expect(evaluationsFrom(rated, '2026-11')).toBe(21);
    expect(ratedBefore(rated, '2026-11')).toBe(true);
    expect(ratedBefore(rated, '2026-09')).toBe(false);
    expect(evaluationsFrom({}, '2026-11')).toBe(0);
  });
});
