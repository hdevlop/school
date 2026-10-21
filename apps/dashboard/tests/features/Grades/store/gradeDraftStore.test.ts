import { describe, expect, it } from 'bun:test';
import { createStore } from 'zustand/vanilla';
import { createGradeDraftState, createGradeDraftStore, gradeDraftKey } from '@/features/Grades/store/gradeDraftStore';

describe('grade draft isolation', () => {
  it('retains drafts in their original account, year, section and source', () => {
    const store = createStore(createGradeDraftState);
    const scope = ['account', '2026-2027', 'assessment', 'quiz', 'A'] as const;
    const key = gradeDraftKey(...scope);
    store.getState().patch(key, 'student', { marksObtained: 15, status: 'graded' });
    scope.forEach((_, index) => {
      const other: [string, string, string, string, string] = [...scope];
      other[index] += '-other';
      expect(store.getState().drafts[gradeDraftKey(...other)]).toBeUndefined();
    });
    expect(store.getState().drafts[key]?.student.marksObtained).toBe(15);
  });

  it('merges marks and feedback, then clears only the saved roster', () => {
    const store = createStore(createGradeDraftState);
    store.getState().patch('first', 'student', { marksObtained: 15 });
    store.getState().patch('first', 'student', { feedback: 'Good work' });
    store.getState().patch('second', 'student', { marksObtained: 12 });
    expect(store.getState().drafts.first.student).toEqual({ marksObtained: 15, feedback: 'Good work' });
    store.getState().clear('first');
    expect(store.getState().drafts.first).toBeUndefined();
    expect(store.getState().drafts.second.student.marksObtained).toBe(12);
  });

  it('restores a tab draft after remount/reload and removes saved drafts from storage', async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    const first = createGradeDraftStore(storage);
    first.getState().patch('roster', 'student', { marksObtained: 15 });
    const reopened = createGradeDraftStore(storage);
    await reopened.persist.rehydrate();
    expect(reopened.getState().drafts.roster.student.marksObtained).toBe(15);
    reopened.getState().clear('roster');
    const afterSave = createGradeDraftStore(storage);
    await afterSave.persist.rehydrate();
    expect(afterSave.getState().drafts).toEqual({});
  });
});
