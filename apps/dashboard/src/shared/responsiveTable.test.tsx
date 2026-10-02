import { expect, test } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { NTable } from 'najm-kit';

test('responsive table loading markup matches the server at phone width', () => {
  const initialWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const render = (responsiveSkeleton: boolean) => renderToString(
    <NTable
      data={[]}
      columns={[{ accessorKey: 'name', header: 'Name' }]}
      loading
      renderCard={() => <div>Card</div>}
      responsiveSkeleton={responsiveSkeleton}
    />,
  );

  try {
    Reflect.deleteProperty(globalThis, 'window');
    const serverDefault = render(false);
    const serverResponsive = render(true);
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { matchMedia: () => ({ matches: true }) },
    });

    // Demonstrate the reported viewport-dependent first render, then exercise
    // the published option used by School's loading tables.
    expect(render(false)).not.toBe(serverDefault);
    expect(render(true)).toBe(serverResponsive);
    expect(serverResponsive).toContain('data-ntable-skeleton-variant="table"');
    expect(serverResponsive).toContain('data-ntable-skeleton-variant="cards"');
  } finally {
    Reflect.deleteProperty(globalThis, 'window');
    if (initialWindow) Object.defineProperty(globalThis, 'window', initialWindow);
  }
});
