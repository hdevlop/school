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
      aria-label={action.label}
      title={action.label}
      disabled={loading}
      onClick={() => action.onSelect?.()}
      leftIcon={<Printer className="size-4" />}
    />
  );
}
