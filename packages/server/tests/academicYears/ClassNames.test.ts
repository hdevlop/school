import { describe, expect, it } from 'bun:test';
import { findClassByName, SCHOOL_CLASS_NAMES } from '@sms/contracts';
import { createClassDto, createClassesBulkDto, updateClassDto } from '../../src/modules/classes/ClassDto';
import { ClassService } from '../../src/modules/classes/ClassService';
import { ClassValidator } from '../../src/modules/classes/ClassValidator';
import { withEnglishMessages } from '../support/englishMessages';

describe('class naming at the API boundary', () => {
  it.each([...SCHOOL_CLASS_NAMES])('keeps $app as the app name when $official is submitted', ({ official, app }) => {
    expect(createClassDto.parse({ name: official, level: 'primary' }).name).toBe(app);
    expect(updateClassDto.parse({ name: ` ${official.toLowerCase()} ` }).name).toBe(app);
    expect(createClassesBulkDto.parse([{ name: official, level: 'primary', academicYear: '2026-2027' }])[0].name).toBe(app);
  });

  it('rejects blank names and keeps custom class names', () => {
    expect(createClassDto.safeParse({ name: '   ', level: 'primary' }).success).toBe(false);
    expect(createClassDto.parse({ name: 'Blue', level: 'primary' }).name).toBe('Blue');
  });

  it('uses the resolved saved name for named student lookups', async () => {
    const calls: unknown[][] = [];
    const service = new ClassService({
      getStudentsByClassName: async (...args: unknown[]) => { calls.push(args); return [{ id: 'student' }]; },
    } as any, {
      ensureExistsByName: async (name: string) => { expect(name).toBe('1APG'); return { id: 'class', name: 'CP' }; },
    } as any, {
      getPublicSettings: async () => ({ currentAcademicYear: '2026-2027' }),
    } as any, {} as any);
    expect((await service.getStudentsByName('1APG', 'A')).map(student => student.id)).toEqual(['student']);
    expect(calls).toEqual([['CP', 'A', '2026-2027']]);
  });

  it('checks duplicate aliases while excluding only the class being edited', async () => {
    const saved = [{ id: 'app', name: 'CP' }];
    const validator = withEnglishMessages(new ClassValidator({
      getByName: async (name: string, year: string, excludeId?: string) => {
        expect(year).toBe('2026-2027');
        return findClassByName(saved.filter(item => item.id !== excludeId), name);
      },
    } as any, {} as any));
    await expect(validator.ensureNameUnique('1APG', '2026-2027')).rejects.toThrow();
    await validator.ensureNameUnique('1APG', '2026-2027', 'app');
    saved.push({ id: 'official', name: '1APG' });
    await expect(validator.ensureNameUnique('CP', '2026-2027', 'app')).rejects.toThrow();
    await expect(validator.ensureNameUnique('1APG', '2026-2027', 'official')).rejects.toThrow();
  });
});
