// Cache keys and request scope for year-dependent reads and writes. A key
// names the account and the concrete year; the request made for it sends
// that same year as `X-Academic-Year`. Feature API functions stay plain
// (`api.get('/students')`) and never pass the year themselves.

import type { QueryKey } from '@tanstack/react-query';
import { ACADEMIC_YEAR_HEADER } from '@sms/contracts/academic-years';
import { withRequestHeaders } from '@/lib/requestHeaders';

export type YearScope = { accountScope: string; academicYear: string | undefined };

const YEAR_SEGMENT = 'academicYear';

/** `[resource, account, 'academicYear', year, ...parts]` — `[resource]` still prefixes every year. */
export function yearScopedKey(resource: string, scope: YearScope, ...parts: readonly unknown[]): QueryKey {
  return [resource, scope.accountScope, YEAR_SEGMENT, scope.academicYear, ...parts];
}

/** The year a year-scoped key was formed for. */
export function yearOfKey(key: QueryKey): string | undefined {
  return key[2] === YEAR_SEGMENT && typeof key[3] === 'string' ? key[3] : undefined;
}

/**
 * Runs `send` so the requests it starts synchronously carry `label` as
 * `X-Academic-Year`. Forms pass the year they opened with; queries pass their
 * key's year. Without a label the tab's current selection applies.
 */
export function withAcademicYear<T>(label: string | undefined, send: () => T): T {
  return label ? withRequestHeaders({ [ACADEMIC_YEAR_HEADER]: label }, send) : send();
}
