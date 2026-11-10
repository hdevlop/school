import { describe, expect, it } from 'bun:test';
import { schoolI18n } from '@sms/contracts/locales';
import { createTeacherRequestSchema } from '@/features/Teachers/config/teacherSchemas';

const english = (key: string, params?: Record<string, unknown>) => schoolI18n.translate('en', key as never, params as never);
const schema = createTeacherRequestSchema(english);
const required = { name: 'Youssef Idrissi', email: 'youssef@gmail.com', phone: '212612345678', cin: 'AB123456', address: '12 Rue Hassan II, Rabat' };

describe('teacher sign-up form', () => {
  it('needs only what a teacher can answer alone, without employment terms or classes', () => {
    const parsed = schema.parse(required);
    expect(parsed as Record<string, unknown>).toEqual(required);
    expect(Object.keys(schema.shape)).not.toContain('hireDate');
    expect(Object.keys(schema.shape)).not.toContain('salary');
    expect(Object.keys(schema.shape)).not.toContain('assignments');
  });

  it('asks nothing about subjects or experience: the school settles them after approval', () => {
    for (const field of ['specialization', 'yearsOfExperience', 'academicDegrees']) {
      expect(Object.keys(schema.shape)).not.toContain(field);
    }
  });

  it('refuses each missing required answer', () => {
    for (const field of Object.keys(required) as Array<keyof typeof required>) {
      expect(schema.safeParse({ ...required, [field]: '' }).success).toBe(false);
    }
  });
});
