import { expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider } from 'najm-i18n/react';
import { NTable } from 'najm-kit';
import { translations } from '@sms/contracts/locales';
import RosterFilters from './RosterFilters';

test.each([false, true])('attendance controls remain available with an empty register (filtered=%s)', (isFilteredEmpty) => {
  const markup = renderToStaticMarkup(
    <I18nProvider translations={translations} initialLanguage="en">
      <RosterFilters
        filters={[
          { name: 'class', label: 'Class', type: 'combobox', placeholder: 'Class', value: 'all', onChange: () => {}, options: [{ value: 'all', label: 'All classes' }] },
          { name: 'date', label: 'Date', type: 'date', placeholder: 'Date', value: '2026-10-07', onChange: () => {} },
          { name: 'search', label: 'Search', type: 'text', placeholder: 'Name or code', value: '', onChange: () => {} },
        ]}
        canReset
        onReset={() => {}}
      >
        <span>Attendance summary</span>
      </RosterFilters>
      <NTable
        data={[]}
        columns={[{ accessorKey: 'name' }]}
        isFilteredEmpty={isFilteredEmpty}
        renderEmpty={() => <p>Empty section</p>}
        renderFilteredEmpty={() => <p>No matching students</p>}
      />
    </I18nProvider>,
  );
  expect(markup).toContain('aria-label="Class"');
  expect(markup).toContain('aria-label="Date"');
  expect(markup).toContain('aria-label="Search"');
  expect(markup).toContain('Reset filters');
  expect(markup).toContain('Attendance summary');
  expect(markup).toContain(isFilteredEmpty ? 'No matching students' : 'Empty section');
});
