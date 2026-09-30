import { GradeValidator } from '../../../src/modules/grades/GradeValidator';
import type { GradeRepository } from '../../../src/modules/grades/GradeRepository';
import { withEnglishMessages } from '../../support/englishMessages';

export function gradeValidator(
  repository: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {},
) {
  const validator = withEnglishMessages(new GradeValidator(
    repository as unknown as GradeRepository,
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  ));
  Object.assign(validator, { gt: (key: string) => key }, overrides);
  return validator;
}
