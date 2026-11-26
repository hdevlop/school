'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Sparkles } from 'lucide-react';
import { cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type * as RewardBank from '@sms/contracts/reward-bank';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { useRewardTemplates } from '../hooks/useRewardTemplates';
import { generateCandidates, nextTemplate, templateFormValues, type RewardTemplate } from '../config/rewardTemplateMatch';

/**
 * A small "generate" button for the description's label row. Each click fills
 * the points and description from the next reward for the chosen category
 * and reward type: the school's own bank first, then School's built-in bank
 * in the interface language, so it works on a school whose bank is empty.
 * Clicking again regenerates; both fields stay editable. Nothing is filled
 * until it is clicked, so editing a stored reward keeps its values.
 */
export function RewardTemplateGenerateButton({ className }: { className?: string }) {
  const { t, language } = useTranslation();
  const { can } = useViewerRole();
  const canRead = can('read:reward-templates');
  // The school's bank is read only by those allowed to; the built-in one needs no permission.
  const { rewardTemplates } = useRewardTemplates({ enabled: canRead });
  const { control, getValues, setValue } = useFormContext();
  const [category, rewardType] = useWatch({ control, name: ['category', 'rewardType'] });
  const [lastId, setLastId] = useState<string | null>(null);
  // Loaded with the form, not with every page, like the birthplaces catalog.
  const [bank, setBank] = useState<typeof RewardBank | null>(null);
  useEffect(() => {
    let mounted = true;
    void import('@sms/contracts/reward-bank').then((module) => { if (mounted) setBank(module); });
    return () => { mounted = false; };
  }, []);

  const matches = useMemo(() => generateCandidates(
    canRead ? rewardTemplates as RewardTemplate[] | undefined : [],
    bank ? bank.rewardBankFor(category, rewardType, language) : [],
    category, rewardType,
  ), [canRead, rewardTemplates, bank, category, rewardType, language]);

  // A cycle belongs to one category and reward type.
  useEffect(() => { setLastId(null); }, [category, rewardType]);

  const empty = matches.length === 0;
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
      disabled={empty}
      title={empty ? t('rewardTemplates.picker.chooseFirst') : current ? t('rewardTemplates.picker.filledFrom', { title: current.title }) : t('rewardTemplates.picker.generateHint')}
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
