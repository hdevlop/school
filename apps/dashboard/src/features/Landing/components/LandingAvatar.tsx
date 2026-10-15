'use client';
import { NAvatar } from 'najm-kit';

// Fictional portraits belong only to the packaged example testimonials.
const EXAMPLE_PORTRAITS: Record<string, string> = {
  'Salma B.': '/images/landing/family-salma.webp',
  'Omar A.': '/images/landing/family-omar.webp',
};

export function LandingAvatar({ author }: { author: string }) {
  return <NAvatar src={EXAMPLE_PORTRAITS[author]} alt={author} fallback={author.split(' ').map(word => word[0]).slice(0, 2).join('')} className="landing-initials" classNames={{ avatar: 'size-full', fallback: 'bg-[var(--landing-warm)]! text-[var(--landing-ink)]!' }} />;
}
