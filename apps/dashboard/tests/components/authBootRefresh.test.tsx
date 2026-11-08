import { expect, test } from 'bun:test';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ServerInsertedHTMLContext } from 'next/dist/shared/lib/server-inserted-html.shared-runtime';
import { AuthBootRefresh } from '@/components/AuthBootRefresh';
import { authBootRefreshScript } from '@/najm.auth';

test('inserts the auth refresh into server HTML once, with its CSP nonce', () => {
  const callbacks: Array<() => ReactNode> = [];
  const markup = renderToStaticMarkup(
    <ServerInsertedHTMLContext.Provider value={callback => { callbacks.push(callback); }}>
      <AuthBootRefresh nonce="document-nonce" />
    </ServerInsertedHTMLContext.Provider>,
  );

  expect(markup).toBe('');
  expect(callbacks).toHaveLength(1);
  const inserted = renderToStaticMarkup(<>{callbacks[0]()}</>);
  expect(inserted).toContain('id="school-auth-boot-refresh"');
  expect(inserted).toContain('nonce="document-nonce"');
  expect(inserted).toContain(authBootRefreshScript);
  // Streaming can flush the insertion callbacks repeatedly. A later flush
  // must not rotate the refresh token again after the client used its answer.
  expect(renderToStaticMarkup(<>{callbacks[0]()}</>)).toBe('');
});

test('renders no script without the server insertion context, as on client navigation', () => {
  expect(renderToStaticMarkup(<AuthBootRefresh nonce="navigation-nonce" />)).toBe('');
});
