import { describe, expect, it } from 'bun:test';
import { filterRoster } from '@/features/Attendance/config/filterRoster';

const people = [
  { id: '1', name: 'Amine Idrissi', studentCode: 'ST-101', role: 'teacher' },
  { id: '2', name: 'Salma Bennani', studentCode: 'ST-102', role: 'teacher' },
  { id: '3', name: 'Amine Alaoui', role: 'staff' },
];
const getStatus = (id: string) => id === '2' ? 'absent' : 'present';

describe('attendance roster filters', () => {
  it('searches names and student codes without case or surrounding-space differences', () => {
    expect(filterRoster(people, { search: '  IDRISSI ', status: '' }, getStatus)).toEqual([people[0]]);
    expect(filterRoster(people, { search: ' st-102 ', status: '' }, getStatus)).toEqual([people[1]]);
  });

  it('combines search, status and role, and restores the register when cleared', () => {
    expect(filterRoster(people, { search: 'Amine', status: 'present', role: 'teacher' }, getStatus)).toEqual([people[0]]);
    expect(filterRoster(people, { search: 'Amine', status: 'absent' }, getStatus)).toEqual([]);
    expect(filterRoster(people, { search: '', status: '', role: '' }, getStatus)).toEqual(people);
  });

  it('uses current draft marks and leaves the source roster intact', () => {
    expect(filterRoster(people, { search: '', status: 'late' }, (id) => id === '1' ? 'late' : getStatus(id))).toEqual([people[0]]);
    expect(people).toHaveLength(3);
    expect(filterRoster([], { search: '', status: '' }, getStatus)).toEqual([]);
  });
});
