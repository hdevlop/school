// Run in a separate process so auth/component mocks never leak into other tests.
import assert from 'node:assert/strict';
import { mock } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { matchPermission } from 'najm-auth/client';
import { createStore } from 'zustand/vanilla';
import type { NTableProps, NTableState } from 'najm-kit';

let permissions: string[] = ['read:sections', 'read:cycles'];
let captured: NTableProps<any>;
const viewer = { role: 'accounting', can: (permission: string) => matchPermission(permissions, permission) };
const kit = await import('najm-kit');
mock.module('najm-kit', () => ({ ...kit, NTable: (props: NTableProps<any>) => { captured = props; return null; } }));
mock.module('@/features/Users/hooks/useViewerRole', () => ({ useViewerRole: () => viewer }));
mock.module('najm-i18n/react', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const { SchoolTable } = await import('@/components/SchoolTable');
const { PermissionButton } = await import('@/components/PermissionButton');

let mutations = 0;
const mutate = () => { mutations++; };
const row = { id: 'section-a' };
const store = createStore(() => ({
  table: { getFilteredSelectedRowModel: () => ({ rows: [{ id: row.id, original: row }] }) },
  rowSelection: { [row.id]: true },
}));
Object.assign(store, { use: {
  table: () => store.getState().table,
  rowSelection: () => store.getState().rowSelection,
} });
const props = {
  data: [row], columns: [], addButtonText: 'Add section',
  onCreate: mutate, onEdit: mutate, onDelete: mutate, onBulkDelete: mutate, onCellEdit: mutate,
  onView: () => {},
};
const render = (resource: string, extra: Partial<NTableProps> = {}) => {
  renderToStaticMarkup(<SchoolTable {...props} permissionResource={resource} {...extra} />);
  return captured!;
};
const rowItems = (table: NTableProps) => {
  const menu = typeof table.menu === 'function' ? { row: table.menu } : table.menu;
  return menu?.row?.(row) ?? [];
};
for (const resource of ['sections', 'cycles', 'staff']) {
  const table = render(resource);
  assert.equal(table.onCreate, undefined);
  assert.equal(table.onEdit, undefined);
  assert.equal(table.onDelete, undefined);
  assert.equal(table.onBulkDelete, undefined);
  assert.equal(table.onCellEdit, undefined);
  const items = rowItems(table);
  assert.equal(items[0].disabled, undefined); // Reading remains available.
  for (const item of items.slice(1)) {
    assert.equal(item.disabled, true);
    assert.equal(item.onSelect, undefined);
  }
  const html = renderToStaticMarkup(<kit.TableStoreContext.Provider value={store as any}>{table.renderToolbar?.({} as NTableState)}</kit.TableStoreContext.Provider>);
  assert.match(html, /<button[^>]*disabled=""[^>]*>/);
  assert.match(html, /aria-label="Add section"/);
}
const button = renderToStaticMarkup(<PermissionButton permission="create:sections" onClick={mutate}>Add</PermissionButton>);
assert.match(button, /<button[^>]*disabled=""[^>]*>/);
assert.equal(mutations, 0);

permissions = ['read:fees', 'create:fees', 'update:fees'];
const finance = render('fees');
assert.equal(finance.onCreate, mutate);
assert.equal(finance.onEdit, mutate);
assert.equal(finance.onDelete, undefined);
finance.onCreate?.();
assert.equal(mutations, 1);

// Custom workflow menus must be disabled too, without a callable mutation.
const custom = render('fees', { menu: { row: () => [{
  label: 'Approve', permission: 'update:expenses', onSelect: mutate,
}] } });
assert.equal(rowItems(custom)[0].disabled, true);
assert.equal(rowItems(custom)[0].onSelect, undefined);

permissions = ['*:*'];
viewer.role = 'admin';
const admin = render('sections');
assert.equal(admin.onCreate, mutate);
assert.equal(admin.onCellEdit, mutate);
assert.equal(admin.onBulkDelete, mutate);
assert.equal(rowItems(admin)[1].disabled, false);
assert.doesNotMatch(renderToStaticMarkup(<PermissionButton permission="create:sections">Add</PermissionButton>), /disabled=""/);

// Revocation takes effect on the next render; no role-name allowlist grants writes.
permissions = ['read:sections'];
assert.equal(render('sections').onEdit, undefined);
console.log('permission controls verified');
