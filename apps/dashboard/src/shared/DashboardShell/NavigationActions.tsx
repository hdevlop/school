'use client';

import { createContext, useContext } from 'react';
import type { ThemeSettingsSheet } from '@/features/Settings/components/ThemeSettingsSheets';

// The shell owns the sheets. Home only invokes the same action as the sidebar.
const NavigationActions = createContext<{ openThemeSettings: (sheet: ThemeSettingsSheet) => void } | null>(null);
export const NavigationActionsProvider = NavigationActions.Provider;
export const useNavigationActions = () => useContext(NavigationActions);
