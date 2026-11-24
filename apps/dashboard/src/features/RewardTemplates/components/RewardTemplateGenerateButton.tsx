'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Sparkles } from 'lucide-react';
import { cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useRewardTemplates } from '../hooks/useRewardTemplates';
import { nextTemplate, templateFormValues, templatesFor, type RewardTemplate } from '../config/rewardTemplateMatch';

/**
 * A small "generate" button for the description's label row. Each click fills
 * the points and description from the next bank reward of the chosen category
 * and reward type, so clicking again regenerates; both fields stay editable.
 * Nothing is filled until it is clicked, so editing a stored reward keeps its
 * values. Hidden when the viewer cannot read the bank.
 */
export function RewardTemplateGenerateButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { can } = useViewerRole();
  const canRead = can('read:reward-templates');
  const { rewardTemplates, isRewardTemplatesLoading } = useRewardTemplates({ enabled: canRead });
  const { control, getValues, setValue } = useFormContext();
  const [category, rewardType] = useWatch({ control, name: ['category', 'rewardType'] });
  const [lastId, setLastId] = useState<string | null>(null);

  const matches = useMemo(
    () => templatesFor(rewardTemplates as RewardTemplate[] | undefined, category, rewardType),
    [rewardTemplates, category, rewardType],
  );

  // A cycle belongs to one category and reward type.
  useEffect(() => { setLastId(null); }, [category, rewardType]);

  if (!canRead) return null;

  const empty = !isRewardTemplatesLoading && matches.length === 0;
  const position = lastId ? matches.findIndex((template) => template.id === lastId) + 1 : 0;
  const current = position > 0 ? matches[position - 1] : undefined;

  const generate = () => {
    const template = nextTemplate(matches, lastId, getValues('description'));
    if (!template) return;
    const values = templateFormValues(template);
    setValue('points', values.points, { shouldDirty: true, shouldValidate: true });
    setValue('description', values.description, { shouldDirty: true, shouldValidate: true });
    setLastId(template.id);
  };

  return (
    <button
      type="button"
      onClick={generate}
      disabled={empty || isRewardTemplatesLoading}
      title={empty ? t('rewardTemplates.picker.noMatch') : current ? t('rewardTemplates.picker.filledFrom', { title: current.title }) : t('rewardTemplates.picker.generateHint')}
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 text-xs font-medium text-primary transition-colors',
        'hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-muted-foreground',
        className,
      )}
    >
      <Sparkles aria-hidden className="size-3.5" />
      {t(lastId ? 'rewardTemplates.picker.regenerate' : 'rewardTemplates.picker.generate')}
      {position > 0 && matches.length > 1 && (
        <span className="tabular-nums text-muted-foreground">{position}/{matches.length}</span>
      )}
    </button>
  );
}
