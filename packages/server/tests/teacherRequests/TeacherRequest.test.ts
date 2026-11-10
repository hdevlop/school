import 'reflect-metadata';
import { describe, expect, it, mock } from 'bun:test';
import { getEffectiveGuards } from 'najm-guard';
import { guardConfig } from '../../src/config';
import { yearScopedModules } from '../../src/config/yearScope';
import { TeacherRequestApprovalController } from '../../src/modules/teacherRequests/TeacherRequestApprovalController';
import { createTeacherRequestDto } from '../../src/modules/teacherRequests/TeacherRequestDto';
import { TeacherRequestController } from '../../src/modules/teacherRequests/TeacherRequestController';
import { TeacherRequestService } from '../../src/modules/teacherRequests/TeacherRequestService';

const valid = { name: 'Youssef Idrissi', email: 'youssef@gmail.com', phone: '212612345678', cin: 'AB123456', address: '12 Rue Hassan II' };
const stored = { ...valid, id: 'request', gender: null, specialization: 'Maths', yearsOfExperience: 4, academicDegrees: null };

function harness(overrides: { created?: object | undefined; createTeacher?: () => Promise<object> } = {}) {
  const create = mock(async () => ('created' in overrides ? overrides.created : { id: 'request' }));
  const remove = mock(async () => {});
  const emit = mock(async () => {});
  const createTeacher = mock(overrides.createTeacher ?? (async () => ({ id: 'teacher', emailSent: true })));
  const notify = mock(async () => []);
  const service = new TeacherRequestService(
    { create, delete: remove } as never,
    { ensureExists: async () => stored } as never,
    { create: createTeacher } as never,
    { createTeacherRequestNotification: notify } as never,
    { getCurrentLanguage: () => 'fr' } as never,
  );
  Object.assign(service, { events: { emit } });
  return { service, create, remove, emit, createTeacher, notify };
}

describe('public teacher sign-up', () => {
  it('reads the address the way Google reports it', () => {
    expect(createTeacherRequestDto.parse({ ...valid, email: '  Youssef@Gmail.COM ' }).email).toBe('youssef@gmail.com');
  });

  it('asks for what a teacher record cannot be created without', () => {
    for (const field of ['name', 'email', 'phone', 'cin', 'address'] as const) {
      const { [field]: _omitted, ...rest } = valid;
      expect(createTeacherRequestDto.safeParse(rest).success).toBe(false);
    }
    expect(createTeacherRequestDto.safeParse({ ...valid, address: '   ' }).success).toBe(false);
  });

  it('drops a filled honeypot before saving or notifying anyone', async () => {
    const { service, create, emit } = harness();
    expect(await service.create({ ...valid, website: 'robot' })).toEqual({ received: true });
    expect(create).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('stores only the request and announces it', async () => {
    const { service, create, emit } = harness();
    expect(await service.create({ ...valid, specialization: '', website: '' })).toEqual({ received: true });
    expect(create).toHaveBeenCalledWith({ ...valid, specialization: null, academicDegrees: null });
    expect(emit).toHaveBeenCalledWith('teacherRequest.created', { id: 'request', language: 'fr' });
  });

  it('answers a second request for the same address exactly like the first, and stays silent', async () => {
    const { service, emit } = harness({ created: undefined });
    expect(await service.create(valid)).toEqual({ received: true });
    expect(emit).not.toHaveBeenCalled();
  });
});

describe('reviewing a teacher sign-up', () => {
  it('creates the teacher through the usual path, then removes the request', async () => {
    const { service, createTeacher, remove } = harness();
    expect(await service.approve('request')).toEqual({ id: 'teacher', emailSent: true });
    expect(createTeacher).toHaveBeenCalledWith(expect.objectContaining({ ...valid, specialization: 'Maths', yearsOfExperience: 4, gender: undefined, hireDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }));
    expect(remove).toHaveBeenCalledWith('request');
  });

  it('keeps the request when the teacher cannot be created', async () => {
    const { service, remove } = harness({ createTeacher: async () => { throw new Error('CIN already exists'); } });
    await expect(service.approve('request')).rejects.toThrow('CIN already exists');
    expect(remove).not.toHaveBeenCalled();
  });

  it('removes a rejected request', async () => {
    const { service, remove, createTeacher } = harness();
    expect(await service.reject('request')).toEqual({ id: 'request' });
    expect(remove).toHaveBeenCalledWith('request');
    expect(createTeacher).not.toHaveBeenCalled();
  });
});

describe('who may reach it', () => {
  const config = guardConfig().config;
  const defaultGuards = getEffectiveGuards(class Unguarded {}, 'none', config);

  it('opens only the form to the public', () => {
    expect(getEffectiveGuards(TeacherRequestController, 'create', config)).toEqual([]);
  });

  it('gives approval the selected year and leaves the public form without one', () => {
    expect(Object.values(yearScopedModules)).toContain(TeacherRequestApprovalController);
    expect(Object.values(yearScopedModules)).not.toContain(TeacherRequestController);
  });

  it('keeps the review behind more than sign-in', () => {
    const review = [[TeacherRequestController, 'list'], [TeacherRequestController, 'reject'], [TeacherRequestApprovalController, 'approve']] as const;
    for (const [controller, method] of review) {
      const guards = getEffectiveGuards(controller, method, config);
      expect(guards.length).toBeGreaterThan(0);
      expect(guards).not.toEqual(defaultGuards);
    }
  });
});
