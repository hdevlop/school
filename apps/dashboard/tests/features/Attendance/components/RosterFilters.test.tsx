import { expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider } from 'najm-i18n/react';
import { NTable } from 'najm-kit';
import { translations } from '@sms/contracts/locales';
import RosterFilters from '@/features/Attendance/components/RosterFilters';
import RosterHeader from '@/features/Attendance/components/RosterHeader';

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

test('loading replaces every filter, count and action with non-interactive placeholders', () => {
  const noop = () => {};
  const markup = renderToStaticMarkup(
    <I18nProvider translations={translations} initialLanguage="en">
      <RosterFilters
        loading
        filters={[
          { name: 'class', label: 'Class', type: 'combobox', placeholder: 'All classes', value: 'all', onChange: noop },
          { name: 'section', label: 'Section', type: 'select', placeholder: 'All sections', value: '', onChange: noop },
          { name: 'date', label: 'Date', type: 'date', placeholder: 'Date', value: '2026-11-01', onChange: noop },
          { name: 'search', label: 'Search', type: 'text', placeholder: 'Search name or code', value: '', onChange: noop },
          { name: 'status', label: 'Status', type: 'select', placeholder: 'All statuses', value: '', onChange: noop },
        ]}
        canReset
        onReset={noop}
      >
        <RosterHeader
          loading
          hasChanges={false}
          stats={{ total: 0, present: 0, absent: 0, late: 0, unmarked: 0 }}
          onSubmit={noop}
          onMarkAllPresent={noop}
          print={<button type="button">Print attendance</button>}
        />
      </RosterFilters>
    </I18nProvider>,
  );
  expect(markup).toContain('aria-busy="true"');
  expect(markup.match(/data-roster-loading-filter=/g)).toHaveLength(5);
  for (const action of ['reset', 'mark-all', 'print', 'submit']) {
    expect(markup).toContain(`data-roster-loading-action="${action}"`);
  }
  expect(markup).toContain('data-roster-loading-counts');
  expect(markup).not.toContain('<input');
  expect(markup).not.toContain('<button');
  expect(markup).not.toContain('role="combobox"');
  expect(markup).not.toContain('Present: 0');
  expect(markup).not.toContain('Print attendance');
});
