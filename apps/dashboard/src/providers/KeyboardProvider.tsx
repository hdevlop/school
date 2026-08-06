// contexts/KeyboardShortcutsContext.tsx
'use client';

import { createContext, useContext, ReactNode, useState } from 'react';

type ShortcutAction = {
  name: string;
  description: string;
  keys: string;
  handler: () => void;
};

type KeyboardShortcutsContextType = {
  shortcuts: ShortcutAction[];
  registerShortcut: (shortcut: ShortcutAction) => void;
  unregisterShortcut: (name: string) => void;
};

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null);

export const KeyboardProvider = ({ children }: { children: ReactNode }) => {
  const [shortcuts, setShortcuts] = useState<ShortcutAction[]>([]);

  const registerShortcut = (shortcut: ShortcutAction) => {
    setShortcuts(prev => [...prev.filter(s => s.name !== shortcut.name), shortcut]);
  };

  const unregisterShortcut = (name: string) => {
    setShortcuts(prev => prev.filter(s => s.name !== name));
  };

  return (
    <KeyboardShortcutsContext.Provider value={{ shortcuts, registerShortcut, unregisterShortcut }}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
};

export const useKeyboardShortcutsContext = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcutsContext must be used within KeyboardShortcutsProvider');
  }
  return context;
};