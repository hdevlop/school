import { afterEach, describe, expect, it } from 'bun:test';
import { captureRequestHeaders, languageHeader, setDefaultRequestHeaders, withRequestHeaders } from '@/lib/requestHeaders';

let unbind = () => {};
afterEach(() => unbind());

describe('request headers bound where a request starts', () => {
  it('uses the default source outside any scope, read when the request starts', () => {
    let year = '2025-2026';
    unbind = setDefaultRequestHeaders(() => ({ 'X-Academic-Year': year }));
    const first = captureRequestHeaders();
    year = '2026-2027';
    expect(first).toEqual({ 'X-Academic-Year': '2025-2026' });
    expect(captureRequestHeaders()).toEqual({ 'X-Academic-Year': '2026-2027' });
  });

  it('lets a scope override the default for the requests it starts synchronously', () => {
    unbind = setDefaultRequestHeaders(() => ({ 'X-Academic-Year': '2026-2027', 'X-Other': 'kept' }));
    const inside = withRequestHeaders({ 'X-Academic-Year': '2025-2026' }, () => captureRequestHeaders());
    expect(inside).toEqual({ 'X-Academic-Year': '2025-2026', 'X-Other': 'kept' });
    expect(captureRequestHeaders()['X-Academic-Year']).toBe('2026-2027');
  });

  it('keeps a request started in a scope on that scope even when it finishes later', async () => {
    unbind = setDefaultRequestHeaders(() => ({ 'X-Academic-Year': 'B' }));
    const send = async () => {
      const headers = captureRequestHeaders();
      await new Promise((resolve) => setTimeout(resolve, 5));
      return headers;
    };
    const slowA = withRequestHeaders({ 'X-Academic-Year': 'A' }, send);
    const fastB = send();
    expect(await fastB).toEqual({ 'X-Academic-Year': 'B' });
    expect(await slowA).toEqual({ 'X-Academic-Year': 'A' });
  });

  it('restores the outer scope after an inner one, even when the callback throws', () => {
    withRequestHeaders({ 'X-A': '1' }, () => {
      expect(() => withRequestHeaders({ 'X-A': '2' }, () => { throw new Error('boom'); })).toThrow('boom');
      expect(captureRequestHeaders()).toEqual({ 'X-A': '1' });
    });
    expect(captureRequestHeaders()).toEqual({});
  });

  it('unbinds only the source it set', () => {
    const first = setDefaultRequestHeaders(() => ({ 'X-A': 'first' }));
    unbind = setDefaultRequestHeaders(() => ({ 'X-A': 'second' }));
    first();
    expect(captureRequestHeaders()).toEqual({ 'X-A': 'second' });
  });
});

describe('the interface language a request names', () => {
  it('sends the base language of <html lang>', () => {
    expect(languageHeader({ lang: 'fr' })).toEqual({ 'X-Language': 'fr' });
    expect(languageHeader({ lang: 'ar-MA' })).toEqual({ 'X-Language': 'ar' });
  });

  it('sends nothing before the page names a language', () => {
    expect(languageHeader({ lang: '' })).toEqual({});
    expect(languageHeader(undefined)).toEqual({});
  });
});
