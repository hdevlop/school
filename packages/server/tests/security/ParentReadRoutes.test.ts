import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { getGuardMetadata } from 'najm-guard';
import { ClassController } from '../../src/modules/classes/ClassController';
import { StudentProfileController } from '../../src/modules/profiles/StudentProfileController';
import { SectionController } from '../../src/modules/sections/SectionController';
import { StudentController } from '../../src/modules/students/StudentController';

const permissions = (controller: any, method: string) => getGuardMetadata(controller, method)
  .filter((guard) => guard.guardClass.name === 'PermissionGuard').map((guard) => guard.params);

// Viewing students, classes or sections does not reach their parents' records.
describe('routes that return parent records', () => {
  it('ask for read:parents as well as their own resource', () => {
    expect(permissions(StudentController, 'getStudentParents')).toContain('read:parents');
    expect(permissions(ClassController, 'getClassParents')).toContain('read:parents');
    expect(permissions(SectionController, 'getParents')).toEqual(['read:sections', 'read:parents']);
  });

  it('keep the student overview open to readers of students, who get it without parents', () => {
    expect(permissions(StudentProfileController, 'getOverview')).toEqual(['read:students']);
  });
});
