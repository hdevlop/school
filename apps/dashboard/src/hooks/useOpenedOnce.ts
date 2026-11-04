'use client';

import { useState } from 'react';

/**
 * True from the first time `open` is true and from then on, so a lazily loaded
 * sheet downloads only when first opened and stays mounted to animate closed.
 */
export function useOpenedOnce(open: boolean) {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened;
}
