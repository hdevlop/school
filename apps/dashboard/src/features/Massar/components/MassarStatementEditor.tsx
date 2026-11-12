'use client';
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, FileText, GripVertical, ToggleRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger, NButton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useNThemeBrandingSlot } from 'najm-theme/react';
import { MASSAR_MAX_COEFFICIENT, withStatementDefaults, type MassarSetup, type MassarStatementSettings } from '@sms/contracts';
import { PlanningPreview } from '@/features/Assessments/planning/PlanningPreview';
import { massarPut, useMassarAction } from '../hooks/useMassar';
import { classOrder } from '../config/massarModel';
import { buildStudentStatementDocument, coefficientKey, orderSubjects, previewStatementSheets } from '../config/studentStatementDocument';
import { MassarSelect } from './MassarShared';
import styles from './Massar.module.css';

/** What a statement can add to the marks, in the order the settings list them. */
export const STATEMENT_SWITCHES = ['subjectAverage', 'subjectRank', 'generalAverage', 'rank', 'coefficientColumn', 'remarks'] as const;
type StatementSwitch = typeof STATEMENT_SWITCHES[number];

/** What is saved: every subject of the year in the order shown, and only the coefficients (per level) that differ from 1. */
function saved(draft: MassarStatementSettings, subjects: string[], keys: readonly string[]): MassarStatementSettings {
  const order = orderSubjects(subjects.map(subject => ({ subject })), draft.order).map(item => item.subject);
  const coefficients = Object.fromEntries(keys.flatMap(key => draft.coefficients[key] !== undefined && draft.coefficients[key] !== 1 ? [[key, draft.coefficients[key]]] : []));
  return { order, coefficients, subjectAverage: draft.subjectAverage, subjectRank: draft.subjectRank, generalAverage: draft.generalAverage, rank: draft.rank, remarks: draft.remarks, coefficientColumn: draft.coefficientColumn };
}
const byLevel = (a: string, b: string) => classOrder(`${a}-1`, `${b}-1`);

/**
 * Réglages Massar → each student's statement (بيان نقط المراقبة), printed from the
 * Massar page. The page as it will print, with everything that shapes it beside it:
 * what it adds to the marks (a menu of checkboxes), and the level's subjects, dragged
 * into order, each with its coefficient (1 unless set). Every change is kept at once.
 * Subjects are named as Massar names them; one name keeps its place on every level.
 */
export function MassarStatementEditor({ settings, setup, open }: { settings: MassarStatementSettings | null; setup: MassarSetup; open: boolean }) {
  const { t, language } = useTranslation(), action = useMassarAction(), logo = useNThemeBrandingSlot('authLogo');
  const levels = useMemo(() => setup.levels.filter(level => setup.subjects.some(subject => subject.levelId === level.id)).sort((a, b) => byLevel(a.code, b.code)), [setup]);
  const names = useMemo(() => [...new Set(setup.subjects.map(subject => subject.name))], [setup]);
  // Every coefficient a level's subject can have.
  const keys = useMemo(() => setup.subjects.flatMap(subject => { const code = setup.levels.find(level => level.id === subject.levelId)?.code; return code ? [coefficientKey(code, subject.name)] : []; }), [setup]);
  const initial = withStatementDefaults(settings);
  const [draft, setDraft] = useState<MassarStatementSettings>(initial), [levelId, setLevelId] = useState(levels[0]?.id ?? '');
  const current = saved(draft, names, keys), order = current.order;
  const level = levels.find(item => item.id === levelId);
  const levelSubjects = level ? orderSubjects([...new Set(setup.subjects.filter(subject => subject.levelId === level.id).map(subject => subject.name))].map(subject => ({ subject })), order).map(item => item.subject) : [];
  const switchesOn = STATEMENT_SWITCHES.filter(key => draft[key]).length, weighed = draft.generalAverage || draft.rank;

  // Every change is kept as it is made; a refusal puts it back.
  const keep = async (next: MassarStatementSettings, undo: () => void) => {
    try { await action.run(() => massarPut('/statement', saved(next, names, keys))); }
    catch { undo(); }
  };
  const toggle = (key: StatementSwitch, checked: boolean) => {
    setDraft({ ...draft, [key]: checked });
    void keep({ ...draft, [key]: checked }, () => setDraft(value => ({ ...value, [key]: !checked })));
  };
  // A subject dropped on another takes its place among this level's subjects; the year's order moves it next to that one.
  const moveSubject = (name: string, target: string) => {
    if (name === target) return;
    const before = levelSubjects.indexOf(name) > levelSubjects.indexOf(target), next = order.filter(item => item !== name), previous = order;
    next.splice(next.indexOf(target) + (before ? 0 : 1), 0, name);
    setDraft({ ...draft, order: next });
    void keep({ ...draft, order: next }, () => setDraft(value => ({ ...value, order: previous })));
  };
  const [dragging, setDragging] = useState<string | null>(null), [over, setOver] = useState<string | null>(null);
  const endDrag = () => { setDragging(null); setOver(null); };

  // What is being typed stays as typed (an emptied field, "1."), shows in the preview once it is a number, and is kept on leaving the field.
  const [typing, setTyping] = useState<Record<string, string>>({});
  const setCoefficient = (key: string, text: string) => {
    setTyping({ ...typing, [key]: text });
    const value = Number(text);
    if (text.trim() !== '' && Number.isFinite(value)) setDraft({ ...draft, coefficients: { ...draft.coefficients, [key]: Math.min(MASSAR_MAX_COEFFICIENT, Math.max(0, value)) } });
  };
  const doneTyping = (key: string) => {
    const { [key]: _done, ...rest } = typing; setTyping(rest);
    const was = initial.coefficients[key] ?? 1;
    if ((draft.coefficients[key] ?? 1) !== was) void keep(draft, () => setDraft(value => ({ ...value, coefficients: { ...value.coefficients, [key]: was } })));
  };

  const settingsKey = JSON.stringify(current);
  const preview = useMemo(() => !open ? '' : buildStudentStatementDocument(previewStatementSheets(setup, levelId), { language, logo, title: t('massar.flow.statementSettings.preview'), settings: JSON.parse(settingsKey) as MassarStatementSettings }), [open, setup, levelId, language, logo, t, settingsKey]);

  return <section className={styles.statementEditor} data-section="preview" aria-labelledby="statement-section-title">
    <div className={styles.statementBar}>
      <h2 id="statement-section-title" className={styles.statementTitle}><FileText aria-hidden /><strong>{t('massar.flow.settingsTabs.statements')}</strong></h2>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={styles.contentTrigger}>
            <ToggleRight aria-hidden /><span>{t('massar.flow.statementSettings.contentTab')}</span><span className={styles.tabCount}>{switchesOn}/{STATEMENT_SWITCHES.length}</span><ChevronDown aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <DropdownMenuLabel>{t('massar.flow.statementSettings.addsTitle')}</DropdownMenuLabel>
          {STATEMENT_SWITCHES.map(key => <DropdownMenuCheckboxItem key={key} className={styles.contentOption} checked={draft[key]} disabled={action.pending}
            onSelect={event => event.preventDefault()} onCheckedChange={checked => toggle(key, checked === true)}>
            <span><strong>{t(`massar.flow.statementSettings.${key}`)}</strong><small>{t(`massar.flow.statementSettings.${key}Help`)}</small></span>
          </DropdownMenuCheckboxItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className={styles.statementSave}>
        {levels.length > 1 && <div className={styles.barSelect}><MassarSelect ariaLabel={t('massar.ui.level')} value={levelId} onChange={setLevelId} items={levels.map(item => ({ value: item.id, label: item.code }))} /></div>}
      </div>
    </div>

    <div className={styles.statementPanel}>
      <div className={styles.previewLayout}>
        <aside className={styles.coefficientSide} aria-labelledby="statement-subjects-title">
          <h3 id="statement-subjects-title"><span>{t('massar.flow.statementSettings.orderTitle')} · {t('massar.flow.statementSettings.coefficient')}</span>{level && <small dir="ltr">{level.code}</small>}</h3>
          {!weighed && <p className={styles.panelNote}>{t('massar.flow.statementSettings.coefficientsOff')}</p>}
          <ol className={styles.coefficientList} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(null); }}>{level && levelSubjects.map((name, index) => {
            const key = coefficientKey(level.code, name), value = draft.coefficients[key] ?? 1;
            return <li key={key} data-changed={value !== 1} data-dragging={dragging === name} data-over={over === name && dragging !== name}
              onDragOver={event => { if (!dragging) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setOver(name); }}
              onDrop={event => { event.preventDefault(); if (dragging) moveSubject(dragging, name); endDrag(); }}>
              <button type="button" draggable className={styles.dragHandle} aria-label={`${name} · ${t('massar.flow.statementSettings.moveUp')} / ${t('massar.flow.statementSettings.moveDown')}`}
                onDragStart={event => { setDragging(name); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', name); const row = event.currentTarget.closest('li'); if (row) event.dataTransfer.setDragImage(row, 12, 18); }}
                onDragEnd={endDrag}
                onKeyDown={event => {
                  const by = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0, target = levelSubjects[index + by];
                  if (by && target) { event.preventDefault(); moveSubject(name, target); }
                }}><GripVertical aria-hidden /></button>
              <span className={styles.orderNumber} aria-hidden>{index + 1}</span>
              <label>
                <bdi dir="auto">{name}</bdi>
                <input type="number" inputMode="decimal" min={0} max={MASSAR_MAX_COEFFICIENT} step={0.5} className={styles.input} value={typing[key] ?? value}
                  aria-label={`${name} · ${t('massar.flow.statementSettings.coefficient')}`} onChange={event => setCoefficient(key, event.target.value)} onBlur={() => doneTyping(key)}
                  onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
              </label>
              <span className={styles.moveButtons}>
                <NButton variant="ghost" size="icon" className="size-6" aria-label={`${name} · ${t('massar.flow.statementSettings.moveUp')}`} title={t('massar.flow.statementSettings.moveUp')} disabled={index === 0} onClick={() => moveSubject(name, levelSubjects[index - 1])}><ArrowUp className="size-3.5" aria-hidden /></NButton>
                <NButton variant="ghost" size="icon" className="size-6" aria-label={`${name} · ${t('massar.flow.statementSettings.moveDown')}`} title={t('massar.flow.statementSettings.moveDown')} disabled={index === levelSubjects.length - 1} onClick={() => moveSubject(name, levelSubjects[index + 1])}><ArrowDown className="size-3.5" aria-hidden /></NButton>
              </span>
            </li>;
          })}</ol>
        </aside>
        <div className={styles.previewFrame}>{preview && <PlanningPreview title={t('massar.flow.statementSettings.preview')} html={preview} />}</div>
      </div>
    </div>
  </section>;
}
