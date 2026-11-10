import { describe, expect, it } from 'bun:test';
import { compareMassarOrder } from '@/features/Grades/config/massarRosterOrder';

const listed = (massarClassName: string, massarPosition: number, studentCode = 'X') => ({ massarClassName, massarPosition, studentCode });
const unlisted = (className: string, sectionName: string, name: string) => ({
  massarClassName: null, massarPosition: null, name, class: { name: className }, section: { name: sectionName },
});

describe('compareMassarOrder', () => {
  it('follows the position inside a Massar class, not the code', () => {
    const rows = [listed('3APIC-1', 3, 'A'), listed('3APIC-1', 1, 'Z'), listed('3APIC-1', 2, 'M')];
    expect(rows.sort(compareMassarOrder).map(row => row.massarPosition)).toEqual([1, 2, 3]);
  });

  it('keeps each Massar class together, primary before collège', () => {
    const rows = [listed('1APIC-1', 1), listed('2APG-10', 1), listed('2APG-2', 2), listed('2APG-2', 1)];
    expect(rows.sort(compareMassarOrder).map(row => `${row.massarClassName}:${row.massarPosition}`))
      .toEqual(['2APG-2:1', '2APG-2:2', '2APG-10:1', '1APIC-1:1']);
  });

  it('puts students Massar does not list last, by School class, section and name', () => {
    const rows = [unlisted('3AC', 'B', 'Sara'), unlisted('3AC', 'A', 'Nour'), listed('3APIC-1', 9), unlisted('3AC', 'A', 'Ali')];
    expect(rows.sort(compareMassarOrder).map(row => ('name' in row ? row.name : 'listed')))
      .toEqual(['listed', 'Ali', 'Nour', 'Sara']);
  });
});
