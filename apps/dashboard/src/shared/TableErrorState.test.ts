import { describe, expect, it } from 'bun:test';
import { hasFailedToLoad, tableErrorProps } from './TableErrorState';

const refused = { status: 403 };
const broken = { status: 500 };

/**
 * The rule the tables and their page headers both ask about, pinned here so the
 * two cannot start answering it differently.
 */
describe('whether a screen is reporting a failure', () => {
  it('reports one when the request failed and there is nothing to show', () => {
    expect(hasFailedToLoad(broken, [])).toBe(true);
    expect(hasFailedToLoad(refused, [])).toBe(true);
    expect(hasFailedToLoad(broken, null)).toBe(true);
    expect(hasFailedToLoad(broken, undefined)).toBe(true);
  });

  it('stays quiet when rows are already on screen', () => {
    // A background refetch fails while the list is displayed. The records shown
    // are still the records that were served; raising an error over them would
    // be the opposite mistake to the one this whole helper exists to prevent.
    expect(hasFailedToLoad(broken, [{ id: 'a' }])).toBe(false);
    expect(hasFailedToLoad(refused, [{ id: 'a' }, { id: 'b' }])).toBe(false);
  });

  it('stays quiet when nothing failed', () => {
    expect(hasFailedToLoad(null, [])).toBe(false);
    expect(hasFailedToLoad(undefined, [{ id: 'a' }])).toBe(false);
  });
});

describe('the props handed to NTable', () => {
  it('passes the error through only when it is being reported', () => {
    expect(tableErrorProps(broken, []).error).toBe(broken);
    expect(tableErrorProps(broken, [{ id: 'a' }]).error).toBeNull();
    expect(tableErrorProps(null, []).error).toBeNull();
  });

  it('always supplies the renderer, and the same one every time', () => {
    // A changing identity would rebuild the table's state on every render.
    const first = tableErrorProps(broken, []);
    const second = tableErrorProps(null, [{ id: 'a' }]);
    expect(first.renderError).toBe(second.renderError);
    expect(typeof first.renderError).toBe('function');
  });
});
