/**
 * Headers a request carries because of where it was started, not because the
 * API function that sends it asked for them.
 *
 * `withRequestHeaders` binds headers to the requests its callback starts
 * synchronously — a query function calling an API function, which calls the
 * HTTP client before its first `await`. Requests started outside any scope get
 * the default source's headers, read when they start. The HTTP client reads
 * them once per request with `captureRequestHeaders` and reuses them for that
 * request's retries, so a request never changes headers mid-flight.
 */

import { LANGUAGE_HEADER } from '@sms/contracts/locales';

export type RequestHeaders = Readonly<Record<string, string>>;

let scoped: RequestHeaders | undefined;
let defaultSource: () => RequestHeaders | undefined = () => undefined;

export function withRequestHeaders<T>(headers: RequestHeaders, run: () => T): T {
  const previous = scoped;
  scoped = { ...previous, ...headers };
  try {
    return run();
  } finally {
    scoped = previous;
  }
}

/** Sets the headers for requests started outside `withRequestHeaders`; returns the unbind. */
export function setDefaultRequestHeaders(source: () => RequestHeaders | undefined): () => void {
  defaultSource = source;
  return () => {
    if (defaultSource === source) defaultSource = () => undefined;
  };
}

/**
 * The interface language as `LANGUAGE_HEADER`, read from `<html lang>`, which
 * the app provider keeps on the language the page is shown in. Only the base
 * language: the server's catalogs are `en`, `fr`, `ar` and `es`.
 */
export function languageHeader(root: { lang?: string } | undefined = globalThis.document?.documentElement): RequestHeaders {
  const language = root?.lang?.split('-')[0]?.toLowerCase();
  return language ? { [LANGUAGE_HEADER]: language } : {};
}

/** The headers of a request starting now: the default source's, overridden by any scope. */
export function captureRequestHeaders(): RequestHeaders {
  return { ...defaultSource(), ...scoped };
}
