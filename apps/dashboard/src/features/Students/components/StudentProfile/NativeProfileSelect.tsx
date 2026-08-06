'use client';

import { ChevronDown } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface NativeProfileSelectOption {
  value: string;
  label: string;
}

interface NativeProfileSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'onChange' | 'value'> {
  value?: string | null;
  options: NativeProfileSelectOption[];
  placeholder?: string;
  onValueChange: (value: string) => void;
}

export function NativeProfileSelect({
  value,
  options,
  placeholder,
  onValueChange,
  className,
  ...props
}: NativeProfileSelectProps) {
  const currentValue = value ?? '';

  return (
    <div className="relative">
      <select
        value={currentValue}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          'h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-2 pr-8 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
          !currentValue && 'text-muted-foreground',
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
