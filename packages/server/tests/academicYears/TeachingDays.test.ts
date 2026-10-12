import { describe, expect, it } from 'bun:test';
import { DEFAULT_TEACHING_DAYS } from '@sms/contracts/routines';
import { updateSettingsDto } from '../../src/modules/settings/SettingsDto';
import { SettingsService } from '../../src/modules/settings/SettingsService';
import { SettingsValidator } from '../../src/modules/settings/SettingsValidator';
import { ClassRoutineService } from '../../src/modules/classRoutines/ClassRoutineService';
import { createRoutineScheduleDto, updateRoutineScheduleDto } from '../../src/modules/classRoutines/ClassRoutineDto';
import { withEnglishMessages } from '../support/englishMessages';

describe('school-wide teaching days', () => {
  it('validates unique days, keeps a partial update partial, and orders the week', () => {
    expect(updateSettingsDto.parse({ schoolName: 'Al Amal' })).toEqual({ schoolName: 'Al Amal' });
    expect(updateSettingsDto.parse({ teachingDays: ['friday', 'monday'] }).teachingDays).toEqual(['monday', 'friday']);
    for (const teachingDays of [[], ['monday', 'monday'], ['holiday']]) {
      expect(updateSettingsDto.safeParse({ teachingDays }).success).toBe(false);
    }
  });

  it('does not accept a section override through routine DTOs', () => {
    expect(createRoutineScheduleDto.parse({ sectionId: 's1', name: 'Week', activeDays: ['sunday'] }))
      .toEqual({ sectionId: 's1', name: 'Week' });
    expect(updateRoutineScheduleDto.parse({ name: 'Week', activeDays: ['sunday'] })).toEqual({ name: 'Week' });
  });

  const settingsService = (conflict: boolean) => {
    const calls: unknown[] = [];
    const repository = {
      getAdminSettings: async () => ({ id: 'school', currentAcademicYear: '2026-2027', teachingDays: DEFAULT_TEACHING_DAYS }),
      teachingDayConflict: async (year: string, days: string[]) => { calls.push(['check', year, days]); return conflict; },
      updateActiveRoutineDays: async (year: string, days: string[]) => { calls.push(['routines', year, days]); },
      update: async (id: string, data: unknown) => { calls.push(['settings', id, data]); return data; },
    };
    return { calls, service: new SettingsService(repository as any, withEnglishMessages(new SettingsValidator(repository as any)), {} as any) };
  };

  it('saves the active year explicitly and refuses a change that hides assignments before any write', async () => {
    const blocked = settingsService(true);
    await expect(blocked.service.update({ teachingDays: ['monday'] })).rejects.toThrow('lessons and supervision');
    expect(blocked.calls).toEqual([['check', '2026-2027', ['monday']]]);
    const allowed = settingsService(false);
    await allowed.service.update({ teachingDays: ['monday', 'friday'] });
    expect(allowed.calls).toEqual([
      ['check', '2026-2027', ['monday', 'friday']],
      ['routines', '2026-2027', ['monday', 'friday']],
      ['settings', 'school', { teachingDays: ['monday', 'friday'] }],
    ]);
  });

  it('leaves routines alone when changing another setting', async () => {
    const { service, calls } = settingsService(false);
    await service.update({ schoolName: 'Al Amal' });
    expect(calls).toEqual([['settings', 'school', { schoolName: 'Al Amal' }]]);
  });

  it('creates routines with school days instead of a caller override', async () => {
    let saved: any;
    const repository = {
      getPublishedForSection: async () => null,
      getSchoolTeachingDays: async () => ['monday', 'wednesday'],
      createSchedule: async (data: unknown) => { saved = data; return { id: 'new-routine' }; },
    };
    const service = new ClassRoutineService(repository as any, { ensureSectionInSelectedYear: async () => ({}) } as any);
    service.updateLayout = async () => saved;
    await service.create({ sectionId: 's1', name: 'Week', activeDays: ['sunday'] } as any);
    expect(saved.activeDays).toEqual(['monday', 'wednesday']);
  });
});
