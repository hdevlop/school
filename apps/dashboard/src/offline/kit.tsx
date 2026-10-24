'use client';
/** Neutral-build public adapters. Every other Kit export forwards unchanged. */
import { useContext, type ComponentProps } from 'react';
import { TabsContent as OriginalTabsContent, NStatCard as OriginalStatCard } from 'najm-kit';
import { ReadCoverageContext } from './readCoverage';
// Preserve the public facade; actual School useDialog call sites still use the translated shared wrapper.
// eslint-disable-next-line no-restricted-imports
export * from 'najm-kit';

export function TabsContent(props: ComponentProps<typeof OriginalTabsContent>) {
  const coverage = useContext(ReadCoverageContext);
  if (!coverage || coverage.panels.has(props.value)) return <OriginalTabsContent {...props} />;
  return <OriginalTabsContent {...props}><p role="status" className="rounded-lg border bg-card p-6">{coverage.unavailableText}</p></OriginalTabsContent>;
}

export function NStatCard(props: ComponentProps<typeof OriginalStatCard>) {
  const coverage = useContext(ReadCoverageContext);
  if (!coverage?.unavailableStatisticLabels.has(String(props.label)) || props.variant === 'usage') return <OriginalStatCard {...props} />;
  return <OriginalStatCard {...props} value="—" />;
}
