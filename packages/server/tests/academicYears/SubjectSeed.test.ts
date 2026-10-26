import { describe, expect, it, mock } from 'bun:test';
import { schoolSubjectsData, schoolSubjectsForLevels } from '@sms/contracts/subjects';
import { SubjectRepository } from '../../src/modules/subjects/SubjectRepository';
import { SubjectService } from '../../src/modules/subjects/SubjectService';
import { SubjectValidator } from '../../src/modules/subjects/SubjectValidator';

type SubjectRecord = typeof schoolSubjectsData[number];

function subjectSeed(initial: SubjectRecord[] = []) {
  const rows = new Map(initial.map(subject => [subject.id, { ...subject }]));
  const repository = {
    getByCode: mock(async (code: string) => [...rows.values()].find(subject => subject.code.toUpperCase() === code)),
    getById: async (id: string) => rows.get(id),
    create: mock(async (data: SubjectRecord) => {
      rows.set(data.id, { ...data });
      return rows.get(data.id)!;
    }),
    update: mock(async (id: string, data: Partial<SubjectRecord>) => {
      rows.set(id, { ...rows.get(id)!, ...data });
      return rows.get(id)!;
    }),
  };
  const typedRepository = repository as unknown as SubjectRepository;
  return {
    rows, repository,
    service: new SubjectService(typedRepository, new SubjectValidator(typedRepository)),
  };
}

describe('subject seeding without changing historical references', () => {
  it('creates missing subjects and becomes a no-op on repeat runs', async () => {
    const { service, rows, repository } = subjectSeed();
    const defaults = schoolSubjectsForLevels(['Primaire']);
    expect(await service.seedDemoSubjects(defaults)).toHaveLength(defaults.length);
    expect(await service.seedDemoSubjects(defaults)).toEqual([]);
    expect([...rows.values()]).toEqual(defaults);
    expect(repository.create).toHaveBeenCalledTimes(defaults.length);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it.each([
    { code: 'PHY', name: 'Physique', description: 'Physique et chimie, mécanique, électricité et thermodynamique' },
    { code: 'SVT', name: 'Sciences de la Vie et de la Terre', description: 'Biologie, géologie, écologie et sciences naturelles' },
    { code: 'ENG', name: 'English', description: 'English language and literature' },
    { code: 'PE', name: 'Éducation Physique', description: 'Sport et éducation physique' },
  ])('upgrades the untouched $code label in place, keeping its existing ID', async old => {
    const current = schoolSubjectsData.find(subject => subject.code === old.code)!;
    const { service, rows, repository } = subjectSeed([{ ...old, id: 'existing-subject-id' }]);
    expect(await service.seedDemoSubjects([current])).toEqual([]);
    expect(rows.get('existing-subject-id')).toEqual({ ...current, id: 'existing-subject-id' });
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledTimes(1);
    await service.seedDemoSubjects([current]);
    expect(repository.update).toHaveBeenCalledTimes(1);
  });

  it('preserves customized names and descriptions, including legacy subjects', async () => {
    const physics = schoolSubjectsData.find(subject => subject.code === 'PHY')!;
    const sport = schoolSubjectsData.find(subject => subject.code === 'PE')!;
    const custom = [
      { ...physics, id: 'custom-physics', name: 'Sciences physiques bilingues' },
      { ...sport, id: 'custom-sport', name: 'Éducation Physique', description: 'Programme de notre école' },
      schoolSubjectsData.find(subject => subject.code === 'HIST')!,
      schoolSubjectsData.find(subject => subject.code === 'GEO')!,
    ];
    const { service, rows, repository } = subjectSeed(custom);
    await service.seedDemoSubjects(schoolSubjectsForLevels(['Collège']));
    for (const subject of custom) expect(rows.get(subject.id)).toEqual(subject);
    expect(repository.update).not.toHaveBeenCalled();
    expect(rows.get('custom-physics')?.id).toBe('custom-physics');
  });

  it('does not use legacy reconciliation to install a custom seed label', async () => {
    const original = {
      id: 'old-english', code: 'ENG', name: 'English', description: 'English language and literature',
    };
    const { service, rows, repository } = subjectSeed([original]);
    await service.seedDemoSubjects([{ ...original, name: 'Custom English course' }]);
    expect(rows.get(original.id)).toEqual(original);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('normalizes codes when recognizing existing defaults', async () => {
    const current = schoolSubjectsData.find(subject => subject.code === 'EI')!;
    const { service, repository } = subjectSeed([current]);
    expect(await service.seedDemoSubjects([{ ...current, code: ' ei ' }])).toEqual([]);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('propagates read, insert and update failures instead of reporting successful skips', async () => {
    const current = schoolSubjectsData.find(subject => subject.code === 'ENG')!;
    const failure = new Error('database unavailable');
    const read = subjectSeed();
    read.repository.getByCode.mockImplementation(async () => { throw failure; });
    await expect(read.service.seedDemoSubjects([current])).rejects.toBe(failure);
    const insert = subjectSeed();
    insert.repository.create.mockImplementation(async () => { throw failure; });
    await expect(insert.service.seedDemoSubjects([current])).rejects.toBe(failure);
    const update = subjectSeed([{ ...current, name: 'English', description: 'English language and literature' }]);
    update.repository.update.mockImplementation(async () => { throw failure; });
    await expect(update.service.seedDemoSubjects([current])).rejects.toBe(failure);
  });
});
