import { expect, it } from 'bun:test';
import { StudentService } from '../../src/modules/students/StudentService';

it('provisions historical demo students with a real audit actor and uses only the seed placement resolver', async () => {
  const actors: string[] = [];
  const validators = Object.fromEntries([
    'ensureIdUnique', 'ensureCodeUnique', 'ensureEmailUnique', 'ensurePhoneUnique',
    'ensureClassAndSectionValid', 'ensureCreateAllowed',
  ].map((name) => [name, () => {}]));
  const service = new StudentService(
    { create: async (data: object) => data } as any, validators as any, {} as any,
    { provisionUser: async () => ({ id: 'real-student-user' }) } as any,
    { processParents: async () => {} } as any, { processFees: async () => {} } as any, {} as any,
    {
      resolveSeedStudentPlacement: async () => ({ id: 'historical-year', label: '2023-2024' }),
      resolveNewStudentPlacement: () => { throw new Error('Ordinary active-year creation was called'); },
      create: async (_data: object, actorId: string) => { actors.push(actorId); },
    } as any, { processFile: async () => null } as any,
  );
  const before = process.env.SEED_MODE;
  try {
    process.env.SEED_MODE = 'false';
    await expect(service.createForSeed({} as any)).rejects.toThrow('seed mode');
    process.env.SEED_MODE = 'true';
    await service.createForSeed({
      id: 'demo-student', classId: 'class', sectionId: 'section',
      yearEnrolledOn: '2023-09-01', gender: 'M', dateOfBirth: '2015-01-01',
    } as any);
    expect(actors).toEqual(['real-student-user']);
  } finally {
    if (before === undefined) delete process.env.SEED_MODE;
    else process.env.SEED_MODE = before;
  }
});
