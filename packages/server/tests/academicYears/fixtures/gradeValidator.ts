import { GradeValidator } from '../../../src/modules/grades/GradeValidator';
import type { GradeRepository } from '../../../src/modules/grades/GradeRepository';

export function gradeValidator(
  repository: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {},
) {
  const validator = new GradeValidator(
    repository as unknown as GradeRepository,
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  );
  Object.assign(validator, { gt: (key: string) => key }, overrides);
  return validator;
}
