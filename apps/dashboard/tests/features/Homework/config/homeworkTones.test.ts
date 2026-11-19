import { describe, expect, it } from 'bun:test';
import type { HomeworkRow } from '@sms/contracts';
import { homeworkTones } from '@/features/Homework/config/homeworkTones';

const row = (id: string, subject: [string, string], className: string) =>
  ({ id, subject: { id: subject[0], code: subject[1], name: subject[1] }, class: { id: className, name: className } }) as unknown as HomeworkRow;

describe('the colour of a homework card', () => {
  it('gives each class its own colour when the list holds one subject', () => {
    const rows = ['CP', 'CE1', 'CE2', '1AC'].map((name) => row(name, ['SB09', 'INFO'], name));
    const tone = homeworkTones(rows);
    expect(new Set(rows.map(tone)).size).toBe(4);
  });

  it('colours by class when classes vary more than subjects, as an admin list with one homework of another subject', () => {
    const rows = [...['CP', 'CE1', 'CE2'].map((name) => row(name, ['SB09', 'INFO'], name)), row('ar', ['SB02', 'AR'], 'CP')];
    const tone = homeworkTones(rows);
    expect(new Set(rows.slice(0, 3).map(tone)).size).toBe(3);
    expect(tone(rows[3])).toBe(tone(rows[0]));
  });

  it('colours by subject when subjects vary more, as a family list, a subject without a colour taking one no other has', () => {
    const rows = [row('a', ['SB00', 'MATH'], 'CP'), row('b', ['SB00', 'MATH'], 'CE1'), row('c', ['SB02', 'AR'], 'CP'), row('d', ['X', 'NEW'], 'CP')];
    const tone = homeworkTones(rows);
    expect(tone(rows[0])).toBe('blue');
    expect(tone(rows[1])).toBe('blue');
    expect(tone(rows[2])).toBe('red');
    expect(['blue', 'red']).not.toContain(tone(rows[3]));
  });
});
