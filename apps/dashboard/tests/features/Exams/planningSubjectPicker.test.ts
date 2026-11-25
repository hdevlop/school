import { describe, expect, it } from 'bun:test';
import { foldSubjectName } from '@sms/contracts';
import { planningSubjectPicker } from '@/features/Exams/planning/PlanningSubjects';

const labels = { notInSubjects: 'not in Subjects', wholeSubject: 'whole' };
const subjects = [
  { id: 'fr', name: 'Français', nameAr: null, subSubjects: [{ name: 'Dictée' }, { name: 'Conjugaison' }] },
  { id: 'info', name: 'Informatique', nameAr: null, subSubjects: [] },
] as never;
const taken = (...names: string[]) => new Set(names.map(foldSubjectName));

describe('an exam\'s subject, once a class has one of it in the Contrôle', () => {
  it('offers every subject and sub-subject while none is taken', () => {
    const picker = planningSubjectPicker(subjects, 'Français', labels, taken());
    expect(picker.subjectItems.map(item => item.value)).toEqual(['fr', 'info']);
    expect(picker.partItems.map(item => item.label)).toEqual(['whole', 'Dictée', 'Conjugaison']);
  });

  it('does not offer a subject again whole, nor a sub-subject planned already', () => {
    // A new exam: Informatique is planned, Français whole and its Dictée too.
    const picker = planningSubjectPicker(subjects, '', labels, taken('Informatique', 'Français', 'Dictée'));
    expect(picker.subjectItems.map(item => item.value)).toEqual(['fr']);
    // Picking Français stores its first free sub-subject, the whole being taken.
    expect(picker.subjectName('fr')).toBe('Conjugaison');
    expect(planningSubjectPicker(subjects, 'Conjugaison', labels, taken('Français', 'Dictée')).partItems.map(item => item.label)).toEqual(['Conjugaison']);
  });

  it('keeps showing the exam\'s own subject', () => {
    const picker = planningSubjectPicker(subjects, 'Informatique', labels, taken('Informatique'));
    expect(picker.subjectValue).toBe('info');
  });
});
