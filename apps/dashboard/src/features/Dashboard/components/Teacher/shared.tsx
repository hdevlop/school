'use client';

import type React from 'react';
import Link from 'next/link';
import { cn, NButton, NIcon, type NIconSource } from 'najm-kit';

export const TONE_CLASSES = {
  primary: 'bg-primary/10 text-primary',
  destructive: 'bg-destructive/10 text-destructive',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
} as const;

export type Tone = keyof typeof TONE_CLASSES;

export function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <NButton asChild variant="link" size="sm" className="h-auto p-0 text-xs font-medium lg:text-sm">
      <Link href={href} prefetch={false}>{children}</Link>
    </NButton>
  );
}

export function IconTile({ icon, tone = 'primary', className }: { icon: NIconSource; tone?: Tone; className?: string }) {
  return (
    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', TONE_CLASSES[tone], className)}>
      <NIcon icon={icon} className="size-5" />
    </span>
  );
}
