import { describe, expect, it } from 'bun:test';
import { schoolI18n } from '@sms/contracts/locales';
import { DISCIPLINE_ACTION_VALUES, DISCIPLINE_CATEGORY_VALUES, DISCIPLINE_SEVERITY_VALUES } from '@sms/contracts';

import { createDisciplineSchemas } from '@/features/Discipline/config/disciplineSchemas';

// The English catalog, so a message a test reads proves its key exists.
const english = (key: string, params?: Record<string, unknown>) => schoolI18n.translate('en', key as never, params as never);
const disciplineSchema = createDisciplineSchemas(english).discipline;
const resolveDisciplineSchema = createDisciplineSchemas(english).resolve;

const incident = {
  studentId: 'st1',
  incidentDate: '2026-02-01',
  incidentTime: '09:30',
  category: 'bullying',
  description: 'Repeated name-calling in the corridor.',
};

describe('disciplineSchema', () => {
  it('defaults an unset severity to medium', () => {
    expect(disciplineSchema.parse(incident).severity).toBe('medium');
  });

  it('accepts every category and severity the API accepts', () => {
    for (const category of DISCIPLINE_CATEGORY_VALUES) {
      expect(disciplineSchema.safeParse({ ...incident, category }).success).toBe(true);
    }
    for (const severity of DISCIPLINE_SEVERITY_VALUES) {
      expect(disciplineSchema.safeParse({ ...incident, severity }).success).toBe(true);
    }
  });

  it('insists on a real date and time rather than an approximate one', () => {
    expect(disciplineSchema.safeParse({ ...incident, incidentDate: '01/02/2026' }).success).toBe(false);
    expect(disciplineSchema.safeParse({ ...incident, incidentTime: '9:30' }).success).toBe(false);
    expect(disciplineSchema.safeParse({ ...incident, incidentTime: '25:00' }).success).toBe(false);
  });

  it('refuses a description of nothing but whitespace', () => {
    expect(disciplineSchema.safeParse({ ...incident, description: '   ' }).success).toBe(false);
  });

  it('trims the description it stores', () => {
    expect(disciplineSchema.parse({ ...incident, description: '  pushed a peer  ' }).description).toBe(
      'pushed a peer',
    );
  });
});

describe('resolveDisciplineSchema', () => {
  it('accepts every action the API accepts', () => {
    for (const actionType of DISCIPLINE_ACTION_VALUES) {
      expect(
        resolveDisciplineSchema.safeParse({ actionType, resolutionNote: 'Spoke with both.' }).success,
      ).toBe(true);
    }
  });

  it('will not close an incident without an account of how', () => {
    expect(resolveDisciplineSchema.safeParse({ actionType: 'detention', resolutionNote: '' }).success).toBe(false);
    expect(resolveDisciplineSchema.safeParse({ actionType: 'detention', resolutionNote: '  ' }).success).toBe(false);
  });

  it('leaves the action note optional', () => {
    const parsed = resolveDisciplineSchema.parse({ actionType: 'counseling', resolutionNote: 'Done.' });

    expect(parsed.actionNote).toBeUndefined();
  });
});
