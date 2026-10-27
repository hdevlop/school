'use client';

import { NButton, useResolvedToolbarLabels, useTableStore, type ContextMenuItem } from 'najm-kit';
import { Printer } from 'lucide-react';

export function FeesPrintButton({ loading }: { loading: boolean }) {
  const actions: ContextMenuItem[] = useTableStore.use.toolbarActions();
  const labels = useResolvedToolbarLabels(useTableStore.use.toolbarLabels());
  const action = actions.find(item => item.label === (labels.print ?? 'Print'));
  if (!action) return null;
  return (
    <NButton
      type="button"
      variant="outline"
      size="icon-lg"
      className="border-primary/25 bg-primary/5 text-primary hover:border-primary/50 hover:bg-primary/10"
      aria-label={action.label}
      title={action.label}
      disabled={loading}
      onClick={() => action.onSelect?.()}
    >
      <Printer aria-hidden="true" className="size-4" />
    </NButton>
  );
}
