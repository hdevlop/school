'use client';

import { useState } from 'react';
import screenfull from 'screenfull';
import { NButton, toast, useNajmTheme } from 'najm-kit';
import { Maximize, Moon, Sun } from 'lucide-react';
import LanguageSwitcher from '@/features/Settings/components/LanguageSwitcher';

const actionButtonClass = 'text-foreground hover:text-foreground [&_svg]:text-foreground [&_svg]:opacity-100';

export default function PageHeaderGlobalActions() {
  const { theme, setTheme } = useNajmTheme();
  const [isChangingTheme, setIsChangingTheme] = useState(false);

  const handleToggleTheme = async () => {
    setIsChangingTheme(true);
    try {
      await setTheme(theme === 'dark' ? 'light' : 'dark');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update color theme.');
    } finally {
      setIsChangingTheme(false);
    }
  };

  const handleFullscreen = () => {
    if (screenfull.isEnabled) screenfull.toggle();
  };

  const ThemeIcon = theme === 'dark' ? Sun : Moon;

  return (
    <>
      <LanguageSwitcher />
      <NButton
        type="button"
        variant="ghost"
        size="icon"
        disabled={isChangingTheme}
        onClick={() => void handleToggleTheme()}
        aria-label="Toggle theme"
        className={actionButtonClass}
      >
        <ThemeIcon size={18} />
      </NButton>
      <NButton
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleFullscreen}
        aria-label="Toggle fullscreen"
        className={`hidden sm:inline-flex ${actionButtonClass}`}
      >
        <Maximize size={18} />
      </NButton>
    </>
  );
}
