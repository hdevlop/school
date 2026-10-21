'use client';

import { create, type StateCreator } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export type GradeDraft = Record<string, { marksObtained?: number | null; status?: string; feedback?: string }>;
export const EMPTY_GRADE_DRAFT: GradeDraft = {};

// A draft can never follow another account, year, section or grading source.
export const gradeDraftKey = (accountId: string, year: string, sourceType: string, sourceId: string, sectionId: string) =>
  JSON.stringify([accountId, year, sourceType, sourceId, sectionId]);

interface GradeDraftState {
  drafts: Record<string, GradeDraft>;
  patch: (key: string, studentId: string, patch: GradeDraft[string]) => void;
  clear: (key: string) => void;
}

/** Tab-local drafts survive navigation/reload; only the API owns saved grades. */
export const createGradeDraftState: StateCreator<GradeDraftState> = (set) => ({
  drafts: {},
  patch: (key, studentId, patch) => set((state) => ({
    drafts: {
      ...state.drafts,
      [key]: { ...state.drafts[key], [studentId]: { ...state.drafts[key]?.[studentId], ...patch } },
    },
  })),
  clear: (key) => set((state) => {
    const drafts = { ...state.drafts };
    delete drafts[key];
    return { drafts };
  }),
});

export const createGradeDraftStore = (storage?: StateStorage) => create<GradeDraftState>()(persist(createGradeDraftState, {
  name: 'school-grade-drafts',
  storage: createJSONStorage(() => storage ?? sessionStorage),
  skipHydration: true,
  partialize: (state) => ({ drafts: state.drafts }),
}));

export const useGradeDraftStore = createGradeDraftStore();
