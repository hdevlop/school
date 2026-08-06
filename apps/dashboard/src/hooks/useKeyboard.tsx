// hooks/useKeyboardShortcut.ts
import { useEffect } from 'react';

type Options = {
  enabled?: boolean;
  preventDefault?: boolean;
  ignoreInputs?: boolean;
};

export const useKeyboard = (
  shortcut: string | string[],
  callback: () => void,
  options: Options = {}
) => {
  const { enabled = true, preventDefault = true, ignoreInputs = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const shortcuts = Array.isArray(shortcut) ? shortcut : [shortcut];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (ignoreInputs) {
      }

      const pressedKey = event.key ? event.key.toLowerCase() : '';
      const ctrl = event.ctrlKey;
      const shift = event.shiftKey;
      const alt = event.altKey;
      const meta = event.metaKey;

      for (const shortcut of shortcuts) {
        // Special handling for "enter" key
        if (shortcut.toLowerCase() === 'enter') {
          if (pressedKey === 'enter') {
            if (preventDefault) event.preventDefault();
            callback();
            return;
          }
          continue;
        }

        const parts = shortcut.toLowerCase().split('+');
        const key = parts[parts.length - 1];
        const modifiers = parts.slice(0, -1);

        const hasCtrl = modifiers.includes('ctrl');
        const hasShift = modifiers.includes('shift');
        const hasAlt = modifiers.includes('alt');
        const hasMeta = modifiers.includes('cmd') || modifiers.includes('meta');

        // Check if key matches
        const keyMatches = pressedKey === key;

        // Check modifiers match exactly
        const ctrlMatches = hasCtrl ? ctrl : !ctrl;
        const shiftMatches = hasShift ? shift : !shift;
        const altMatches = hasAlt ? alt : !alt;
        const metaMatches = hasMeta ? meta : !meta;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
          if (preventDefault) event.preventDefault();
          callback();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcut, callback, enabled, preventDefault, ignoreInputs]);
};