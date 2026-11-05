import { useState, type PointerEvent } from 'react';

/** Touch feedback starts before the browser's delayed :active state. */
export function usePressFeedback() {
  const [pressed, setPressed] = useState(false);
  const release = () => setPressed(false);
  return {
    'data-pressed': pressed || undefined,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.isPrimary && event.button === 0) setPressed(true);
    },
    onPointerUp: release,
    onPointerCancel: release,
    onPointerLeave: release,
    onBlur: release,
  };
}
