import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { getMcpControllerTools, getMcpToolGroup } from 'najm-mcp';
import { getValidationConfig } from 'najm-validation';
import { yearScopedModules } from '../../src/config/yearScope';
import { schoolMcpYearHooks } from '../../src/modules/academicYears/requestYear';

describe('controllers registered for the request year', () => {
  it('keys each controller by its MCP tool group, which is what scopes its tools', () => {
    for (const [group, controller] of Object.entries(yearScopedModules)) {
      expect(getMcpToolGroup(controller)).toBe(group);
    }
  });

  // Fee write bodies retain their charged-year field. The year hook uses that
  // value as the MCP selection and does not add a duplicate tool input.
  it('leaves `academicYear` to the year hook in every tool input', () => {
    const declaredTwice: string[] = [];
    for (const controller of Object.values(yearScopedModules)) {
      for (const method of getMcpControllerTools(controller)) {
        const validation = getValidationConfig(controller.prototype, method);
        for (const target of ['params', 'query', 'body'] as const) {
          const shape = (validation?.[target] as { shape?: object } | undefined)?.shape;
          const feeWriteBody = controller.name === 'FeeController' && target === 'body'
            && ['create', 'createClassBulk', 'update'].includes(String(method));
          const studentYearQuery = controller.name === 'StudentController' && target === 'query'
            && ['getStudents', 'getStudent'].includes(String(method));
          if (shape && 'academicYear' in shape && !feeWriteBody && !studentYearQuery) {
            declaredTwice.push(`${controller.name}.${String(method)} ${target}`);
          }
        }
      }
    }
    expect(declaredTwice).toEqual([]);
    const hooks = schoolMcpYearHooks(Object.keys(yearScopedModules));
    expect(hooks.toolInput({ group: 'students', methodKey: 'getStudents' })).toBeUndefined();
    expect(hooks.toolInput({ group: 'students', methodKey: 'getStudent' })).toBeUndefined();
  });

  it('includes the routes that read alerts or announcements through another module', () => {
    expect(Object.keys(yearScopedModules)).toEqual(expect.arrayContaining([
      'alerts', 'announcements', 'operations-dashboard', 'parent-profile',
    ]));
  });

  it('includes assessment and attendance consumers so their failures are visible', () => {
    expect(Object.keys(yearScopedModules)).toEqual(expect.arrayContaining([
      'assessments', 'attendance', 'student-profile', 'teacher-profile',
      'grades', 'dashboard', 'academic-dashboard',
    ]));
  });
});
