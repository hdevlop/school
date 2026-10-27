import type { PointerEvent } from 'react';

/** Keep Najm's scoped shortcuts active after clicking non-focusable table space. */
export function focusTableForKeyboard(event: PointerEvent<HTMLElement>) {
  if (event.button !== 0 || !(event.target instanceof HTMLElement)) return;
  const table = event.target.closest<HTMLElement>('[data-ntable-root]');
  if (!table || !event.currentTarget.contains(table)) return;

  // Controls keep their own focus, including text selection in search/editors.
  if (event.target.closest('input, textarea, select, button, a[href], [contenteditable], [role="combobox"], [role="textbox"]')) return;

  table.tabIndex = -1;
  table.focus({ preventScroll: true });
}
