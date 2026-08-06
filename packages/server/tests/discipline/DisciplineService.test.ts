import { describe, expect, it, mock } from 'bun:test';
import { DisciplineService } from '@server/modules/discipline/DisciplineService';

const user = { id: 'admin_01', role: 'admin' };

const setup = () => {
  const repository = {
    list: mock(() => Promise.resolve([])),
    getById: mock(() => Promise.resolve(null)),
    create: mock((data) => Promise.resolve({ id: 'incident_01', ...data })),
    update: mock((id, data) => Promise.resolve({ id, ...data })),
    delete: mock((id) => Promise.resolve({ id })),
  };
  const validator = {
    ensureExists: mock(() => Promise.resolve({ id: 'incident_01', status: 'open', reportedBy: 'teacher_01' })),
    ensureStudentReady: mock(() => Promise.resolve({ id: 'student_01', status: 'active', classId: 'class_01', sectionId: 'section_01' })),
    ensureTeacherMayReport: mock(() => Promise.resolve()),
    ensureReadable: mock(() => undefined),
    ensureEditable: mock(() => undefined),
    ensureOpen: mock(() => undefined),
    ensureResolved: mock(() => undefined),
    ensureAdministrator: mock(() => undefined),
    ensureIncidentDate: mock(() => undefined),
  };
  return { repository, validator, service: new DisciplineService(repository as any, validator as any) };
};

describe('DisciplineService', () => {
  it('derives reporter and academic snapshots during creation', async () => {
    const { repository, service } = setup();
    await service.create({
      studentId: 'student_01', incidentAt: '2026-07-12T09:30:00.000Z',
      category: 'disrespect', severity: 'high', description: 'Factual description',
    }, { id: 'teacher_01', role: 'teacher' });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      studentId: 'student_01', classId: 'class_01', sectionId: 'section_01',
      reportedBy: 'teacher_01', status: 'open', resolvedBy: null, resolvedAt: null,
    }));
  });

  it('scopes teacher lists to the authenticated reporter', async () => {
    const { repository, service } = setup();
    await service.list({ id: 'teacher_01', role: 'teacher' });
    expect(repository.list).toHaveBeenCalledWith('teacher_01');
  });

  it('recalculates snapshots when the student changes', async () => {
    const { repository, service } = setup();
    await service.update('incident_01', { studentId: 'student_02' }, user);
    expect(repository.update).toHaveBeenCalledWith('incident_01', expect.objectContaining({
      studentId: 'student_02', classId: 'class_01', sectionId: 'section_01',
    }));
  });

  it('captures resolver metadata when resolving', async () => {
    const { repository, service } = setup();
    await service.resolve('incident_01', {
      actionType: 'parent_meeting', resolutionNote: 'The family agreed to a follow-up plan.',
    }, user);
    expect(repository.update).toHaveBeenCalledWith('incident_01', expect.objectContaining({
      status: 'resolved', actionType: 'parent_meeting', resolvedBy: 'admin_01',
    }));
  });

  it('clears all resolution metadata when reopening', async () => {
    const { repository, validator, service } = setup();
    validator.ensureExists.mockImplementation(() => Promise.resolve({ id: 'incident_01', status: 'resolved' }));
    await service.reopen('incident_01', user);
    expect(repository.update).toHaveBeenCalledWith('incident_01', {
      status: 'open', actionType: null, actionNote: null, resolutionNote: null, resolvedBy: null, resolvedAt: null,
    });
  });

  it('requires administrator validation before delete', async () => {
    const { validator, service } = setup();
    await service.delete('incident_01', user);
    expect(validator.ensureAdministrator).toHaveBeenCalledWith(user);
  });
});
