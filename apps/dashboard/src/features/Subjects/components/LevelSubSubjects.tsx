'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ListChecks } from 'lucide-react';
import { toOfficialClassName } from '@sms/contracts';
import { NButton, NErrorState, NLoadingState, NSheet } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { api } from '@/services/http';
import { isAuthorizationError, isConflictError } from '@/services/apiError';
import { SubSubjectsEditor, subSubjectDrafts, type SubSubjectDraft } from './SubSubjectsEditor';

type LevelList = { level: string; subSubjects: Array<{ id: string; name: string }> };
type Target = { subject: { id: string; name: string }; level: string };

const ARABIC_LETTER = /\p{Script=Arabic}/u;
const levelUrl = (subjectId: string, level: string) => `/subjects/${encodeURIComponent(subjectId)}/levels/${encodeURIComponent(level.trim())}`;

/**
 * One level's sub-subjects for a subject (a level is a class name: CE2, 3APG,
 * kept from year to year), in a side sheet. A teacher edits the subjects they
 * teach in that level (SubjectValidator.ensureMayEditLevel). Mounted per
 * target, so each opening starts from what is saved.
 */
function LevelSubSubjectsSheet({ target, open, onClose }: { target: Target; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const { subject, level } = target;
  const query = useQuery({
    queryKey: ['subjects', subject.id, 'levels', level.trim().toLowerCase()],
    queryFn: async () => (await api.get(levelUrl(subject.id, level))).data.data as LevelList,
  });
  const [rows, setRows] = useState<SubSubjectDraft[] | null>(null);
  const save = useMutation({
    mutationFn: async (names: string[]) => (await api.put(levelUrl(subject.id, level), { names })).data.data as LevelList,
    // The list feeds Subjects, Planning, the teacher's exam form and homework.
    onSuccess: () => Promise.all(['subjects', 'exam-planning', 'homework'].map(key => client.invalidateQueries({ queryKey: [key] }))),
  });

  const shown = rows ?? subSubjectDrafts(query.data?.subSubjects);
  const submit = async () => {
    try {
      await save.mutateAsync(shown.map(row => row.name.trim()).filter(Boolean));
      toast.success(t('subjects.levels.saved'));
      onClose();
    } catch (failure) {
      // A refused save says why (a subject this teacher does not teach there, a name another subject uses).
      toast.error((isAuthorizationError(failure) || isConflictError(failure)) && failure instanceof Error && failure.message ? failure.message : t('subjects.levels.saveFailed'));
    }
  };

  const className = toOfficialClassName(level.trim());
  // Above the dialog it may open from (its content sits at z 9990), below popovers (10000).
  return <NSheet open={open} onOpenChange={value => { if (!value && !save.isPending) onClose(); }} icon={ListChecks} width={480} classNames={{ content: '!z-[9995]' }}
    title={t('subjects.levels.title')}
    // Which subject, which class: each label keeps its own direction.
    description={<span className="inline-flex flex-wrap items-center gap-2">
      <bdi dir="auto" className="font-medium text-foreground">{subject.name}</bdi>
      <span dir="ltr" className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{className}</span>
    </span>}
    footer={<div className="flex gap-2 sm:justify-end">
      <NButton type="button" variant="outline" className="flex-1 sm:flex-none" disabled={save.isPending} onClick={onClose}>{t('common.cancel')}</NButton>
      <NButton type="button" className="flex-1 sm:flex-none" loading={save.isPending} disabled={save.isPending || !rows} leftIcon={<Check className="size-4" />}
        onClick={() => { void submit(); }}>{t('common.save')}</NButton>
    </div>}>
    {query.isLoading ? <NLoadingState surface="panel" label={t('common.loading')} />
      : query.error || !query.data ? <NErrorState surface="panel" />
        : <SubSubjectsEditor rows={shown} onChange={setRows} arabic={ARABIC_LETTER.test(subject.name) || undefined} help={t('subjects.levels.help', { level: className })} />}
  </NSheet>;
}

/**
 * A level's sub-subjects in a side sheet: open(subject, level) shows it, and
 * the caller renders sheet. Opened from a dialog, it slides in above it.
 */
export function useLevelSubSubjectsSheet(): { open: (subject: Target['subject'], level: string) => void; sheet: ReactNode } {
  const [isOpen, setIsOpen] = useState(false);
  const openings = useRef(0);
  // The last target stays mounted while the sheet slides shut.
  const [shown, setShown] = useState<{ target: Target; key: number } | null>(null);
  const open = (subject: Target['subject'], level: string) => {
    openings.current += 1;
    setShown({ target: { subject, level }, key: openings.current });
    setIsOpen(true);
  };
  return {
    open,
    sheet: shown && <LevelSubSubjectsSheet key={shown.key} target={shown.target} open={isOpen} onClose={() => setIsOpen(false)} />,
  };
}
