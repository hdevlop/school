'use client'

import React from 'react';
import { Languages, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  NButton,
} from 'najm-kit';
import { useUpdateLang, useTranslation } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

const languages = [
  { code: 'en', name: 'English', iso2: 'us' },
  { code: 'fr', name: 'Français', iso2: 'fr' },
  { code: 'es', name: 'Español', iso2: 'es' },
  { code: 'ar', name: 'العربية', iso2: 'ma' },
];

/**
 * Language Switcher Component
 * Allows users to change the application language
 * Persists selection to user settings via API
 */
const LanguageSwitcher = () => {
  const { language } = useTranslation();
  const { updateLang, isLoading: isUpdatingLang } = useUpdateLang();

  const handleLanguageChange = async (lang: string) => {
    try {
      await updateLang(lang);
    } catch (error) {
      console.error('Failed to update language:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NButton
          type="button"
          variant="ghost"
          size="icon"
          disabled={isUpdatingLang}
          aria-label="Change language"
          className="text-foreground hover:text-foreground [&_svg]:text-foreground [&_svg]:opacity-100"
        >
          {isUpdatingLang ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Languages size={18} />
          )}
        </NButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              language === lang.code && 'bg-primary text-primary-foreground'
            )}
          >
            <span
              className={cn('fi', `fi-${lang.iso2}`, 'shrink-0 rounded-sm')}
              style={{ width: '1.25rem', height: '0.9375rem' }}
            />
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
