'use client';
import { createContext } from 'react';

/** View coverage supplied by the route ledger, not a second entity or preference store. */
export const ReadCoverageContext = createContext<{
  panels: ReadonlySet<string>;
  unavailableStatisticLabels: ReadonlySet<string>;
  unavailableText: string;
} | null>(null);
