'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import screenfull from 'screenfull';
import { NButton } from 'najm-kit';
import { Maximize, Moon, Sun } from 'lucide-react';
import LanguageSwitcher from '@/features/Settings/components/LanguageSwitcher';

const actionButtonClass = 'text-foreground hover:text-foreground [&_svg]:text-foreground [&_svg]:opacity-100';

export default function PageHeaderGlobalActions() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const handleFullscreen = () => {
    if (screenfull.isEnabled) screenfull.toggle();
  };

  const ThemeIcon = mounted && theme === 'dark' ? Sun : Moon;

  return (
    <>
      <LanguageSwitcher />
      <NButton
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleToggleTheme}
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
