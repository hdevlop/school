'use client';
import { NAvatar } from 'najm-kit';

export function LandingAvatar({ author }: { author: string }) {
  return <NAvatar fallback={author.split(' ').map(word => word[0]).slice(0, 2).join('')} className="landing-initials" classNames={{ avatar: 'size-full', fallback: 'bg-[var(--landing-warm)]! text-[var(--landing-ink)]!' }} />;
}
