"use client";

import { NErrorState, NForbiddenState } from 'najm-kit';
import { isPermissionDenied } from '@/lib/queryError';

/**
 * What a table shows when its list request failed.
 *
 * The distinction is the whole point: a refused request is not an empty
 * collection and not a malfunction. Without this, `NTable` receives the `[]`
 * that `useEntityCRUD` returns for a failed query and renders its empty state —
 * "No data", "Add your first item to get started", and an Add button that would
 * be refused too. A teacher who types `/users` was being told the school has no
 * accounts.
 *
 * Every string resolves through the provider's `feedbackDefaults`, so nothing
 * is worded here and all four languages stay in step.
 */
export default function TableErrorState({ error }: { error: unknown }) {
  return isPermissionDenied(error) ? <NForbiddenState /> : <NErrorState />;
}

const renderTableError = (error: unknown) => <TableErrorState error={error} />;

/**
 * Whether the screen is reporting a failure rather than showing a list.
 *
 * A list that already has rows on screen is not being misrepresented, so a
 * failure is only reported when there is nothing to report it against —
 * otherwise every window-focus refetch (`useEntityCRUD` sets `staleTime: 0`)
 * would raise an error state over a table full of perfectly good records the
 * moment the network hiccuped.
 *
 * Exported so the page header can ask the same question: a header that reads
 * "0 users total" above "Access denied" contradicts itself, and the count is a
 * claim about the school rather than about the view.
 */
export function hasFailedToLoad(error: unknown, rows?: readonly unknown[] | null) {
  return Boolean(error) && !(Array.isArray(rows) && rows.length > 0);
}

/**
 * The pair of `NTable` props that make a failed request look like one.
 *
 * Returned together so they cannot drift apart — an `error` without a
 * `renderError` falls back to the kit's untranslated English body, and a
 * `renderError` without an `error` never runs. Module-scope `renderTableError`
 * keeps the identity stable across renders.
 *
 * `rows` is what the table is currently showing — see `hasFailedToLoad`.
 */
export function tableErrorProps(error: unknown, rows?: readonly unknown[] | null) {
  return {
    error: hasFailedToLoad(error, rows) ? error : null,
    renderError: renderTableError,
  };
}
