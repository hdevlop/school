'use client';

import { createContext, useContext, type ReactNode } from 'react';

// The active school year's label as the server read it for this page's first
// render. The root layout provides it from the School settings snapshot.
// `useActiveAcademicYear` answers with it while the public settings are still
// loading, so screens that need the active year (year-aware lists, the
// dashboard's finance widgets) can request their data at once instead of
// after that request. Once loaded, the settings value is the answer, and it
// follows a later year activation.
const RenderedActiveAcademicYearContext = createContext<string | null>(null);

export function RenderedActiveAcademicYearProvider({
  value,
  children,
}: Readonly<{ value: string | null; children: ReactNode }>) {
  return (
    <RenderedActiveAcademicYearContext.Provider value={value}>
      {children}
    </RenderedActiveAcademicYearContext.Provider>
  );
}

export const useRenderedActiveAcademicYear = () => useContext(RenderedActiveAcademicYearContext);
