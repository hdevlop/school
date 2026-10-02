import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { getMcpAnnotations } from 'najm-mcp';
import { StudentController } from '../../src/modules/students/StudentController';

describe('student chat tool routing', () => {
  it('keeps the general student list available among similar read tools', () => {
    // Najm RAG removes alternatives without readOnlyHint as possible writes.
    expect(getMcpAnnotations(StudentController.prototype.getStudents)?.readOnlyHint).toBe(true);
    expect(getMcpAnnotations(StudentController.prototype.getStudentCount)?.readOnlyHint).toBe(true);
  });

  it('does not classify a student mutation as a read', () => {
    expect(getMcpAnnotations(StudentController.prototype.create)?.readOnlyHint).not.toBe(true);
    expect(getMcpAnnotations(StudentController.prototype.delete)?.readOnlyHint).not.toBe(true);
  });
});
