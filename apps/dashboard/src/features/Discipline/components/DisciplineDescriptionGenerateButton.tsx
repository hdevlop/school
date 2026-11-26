'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Sparkles } from 'lucide-react';
import { cn } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type * as DisciplineBank from '@sms/contracts/discipline-bank';

/**
 * A small "generate" button for the description's label row. Each click fills
 * the description with the next of School's built-in wordings for the chosen
 * category and place, in the interface language, those of the chosen
 * severity first: an incident in class is never described "in the
 * playground". Only the description changes: the category, severity and
 * place stay as chosen, and the text stays editable. Nothing is filled until
 * it is clicked.
 */
export function DisciplineDescriptionGenerateButton({ className }: { className?: string }) {
  const { t, language } = useTranslation();
  const { control, getValues, setValue } = useFormContext();
  const [category, severity, location] = useWatch({ control, name: ['category', 'severity', 'location'] });
  const [lastId, setLastId] = useState<string | null>(null);
  // Loaded with the form, not with every page.
  const [bank, setBank] = useState<typeof DisciplineBank | null>(null);
  useEffect(() => {
    let mounted = true;
    void import('@sms/contracts/discipline-bank').then((module) => { if (mounted) setBank(module); });
    return () => { mounted = false; };
  }, []);

  const items = useMemo(() => (bank ? bank.disciplineBankFor(category, severity, location, language) : []), [bank, category, severity, location, language]);
  // A cycle belongs to one category, severity and place.
  useEffect(() => { setLastId(null); }, [category, severity, location]);

  const position = lastId ? items.findIndex((item) => item.id === lastId) + 1 : 0;
  const generate = () => {
    const item = bank?.nextDisciplineDescription(items, lastId, getValues('description'));
    if (!item) return;
    setValue('description', item.description, { shouldDirty: true, shouldValidate: true });
    setLastId(item.id);
  };

  return (
    <button
      type="button"
      onClick={generate}
      disabled={!items.length}
      title={items.length ? t('discipline.form.generateHint') : t('discipline.form.generateChooseCategory')}
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 text-xs font-medium text-primary transition-colors',
        'hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-muted-foreground',
        className,
      )}
    >
      <Sparkles aria-hidden className="size-3.5" />
      {t(lastId ? 'discipline.form.regenerate' : 'discipline.form.generate')}
      {position > 0 && items.length > 1 && <span className="tabular-nums text-muted-foreground">{position}/{items.length}</span>}
    </button>
  );
}
