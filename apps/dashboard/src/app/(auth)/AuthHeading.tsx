import type { ReactNode } from 'react';

/**
 * Title and subtitle for an auth screen.
 *
 * Centred to sit under the stacked logo and wordmark the frame puts above it,
 * so the whole column reads as one axis; the fields below stay left-aligned
 * because their labels are what the eye scans down.
 *
 * Shared so the five screens cannot drift into five heading sizes; the frame
 * around them owns everything else.
 */
export function AuthHeading({
  title,
  subtitle,
}: {
  readonly title: string;
  readonly subtitle?: ReactNode;
}) {
  return (
    <header className="mb-6 space-y-1.5 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
    </header>
  );
}
