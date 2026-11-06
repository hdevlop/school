// Isolate module mocks from the rest of the dashboard test process.
import assert from 'node:assert/strict';
import { mock } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const error = new Error('Massar backend unavailable');
let table: any, header: any;
let manager = false;
mock.module('@/features/Users/hooks/useViewerRole', () => ({ useViewerRole: () => ({ role: manager ? 'registrar' : 'supervisor', isSchoolWide: manager, can: () => true }) }));
mock.module('najm-i18n/react', () => ({ useTranslation: () => ({ t: (key: string, params?: unknown) => key + (params ? JSON.stringify(params) : '') }) }));
mock.module('@/features/AcademicYears/hooks/useViewingAcademicYear', () => ({ useViewingYearKey: () => 'selected-year' }));
mock.module('@/features/Massar/hooks/useMassar', () => ({
  useMassarRead: (path: string) => manager ? ({ data: path.endsWith('/blocked-classes') ? [{ className: '1APG-2', unmatchedCount: 1 }] : path === '/rounds' ? [{ id: 'round', status: 'open' }] : [], error: null, isLoading: false, refetch: () => {} }) : ({ data: null, error, isLoading: false, refetch: () => {} }),
  useMassarAction: () => ({ pending: false, run: () => {} }), massarPost: () => {}, downloadMassar: () => {},
}));
mock.module('@/components/SchoolTable', () => ({ SchoolTable: (props: unknown) => { table = props; return null; } }));
mock.module('@/components/SchoolPageHeader', () => ({ SchoolPageHeader: (props: unknown) => { header = props; return null; } }));
const { MassarRoundsPage } = await import('@/features/Massar/components/MassarRoundsPage');
const { MassarSheetsPage } = await import('@/features/Massar/components/MassarSheetsPage');
for (const Page of [MassarRoundsPage, MassarSheetsPage]) {
  renderToStaticMarkup(<Page />);
  assert.equal(table.error, error); assert.equal(header.subtitle, undefined);
  const html = renderToStaticMarkup(table.renderError());
  assert.match(html, /role="alert"/); assert.match(html, /massar.loadFailed/);
  assert.doesNotMatch(html, /massar.noSheets|massar.noRounds/);
}
manager = true;
const progress = renderToStaticMarkup(<MassarSheetsPage initialRoundId="round" />);
assert.match(progress, /massar.blockedClass/); assert.match(progress, /1APG-2/); assert.match(progress, /href="\/massar\/setup"/);
console.log('Massar failures stay visible');
