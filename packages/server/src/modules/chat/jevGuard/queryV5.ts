import { queryVetoV3 } from './queryV3';
import { explainQueryVetoV4 } from './queryV4';
/** Offline coverage candidate. The measured v3/v4 guards and raw requests stay unchanged. */

const countChoices = new Set(['student_count', 'teacher_count', 'student_and_teacher_count']);
const normalize = (text: string) => text.normalize('NFKD').toLowerCase().replace(/[\p{M}\u0640]/gu, '');
const end = '[\\s.!?؟,]*$';

/** Bounded phrase aliases, not unknown-word deletion or entity normalization. */
export function explainQueryVetoV5(query: any, choice: any) {
  const originalVeto = queryVetoV3(query, choice);
  if (originalVeto) return { veto: originalVeto, aliases: [], unknownWords: [] };
  if (typeof query !== 'string' || !query.trim() || /["«»“”`()[\]{}]/u.test(query)
    || !['small_talk', 'class_list', 'attendance_today', ...countChoices].includes(choice)) {
    return { ...explainQueryVetoV4(query, choice), aliases: [] };
  }
  let text = normalize(query);
  const aliases: string[] = [];
  const alias = (pattern: RegExp, replacement: string, name: string) => {
    const changed = text.replace(pattern, replacement);
    if (changed !== text) aliases.push(name);
    text = changed;
  };
  if (countChoices.has(choice)) {
    alias(/(?<!\p{L})(الموسسة|المدرسة|مدرستنا)\s+بالكامل(?!\p{L})/u, '$1 كاملة', 'whole_school');
    alias(new RegExp(`(?:دون|بدون)\\s+اي\\s+تفصيل${end}`, 'u'), 'دون details', 'no_details_arabic');
    alias(new RegExp(`بلا\\s+تفاصيل${end}`, 'u'), 'بلا details', 'no_details_darija');
    alias(new RegExp(`bla\\s+tafasil${end}`, 'u'), 'bla details', 'no_details_arabizi');
  }
  if (choice === 'student_and_teacher_count') {
    alias(/(?<!\p{L})جوج\s+اعداد\s+بوحدهم(?!\p{L})/u, 'جوج اعداد بوحدو', 'separate_numbers');
    alias(/(?<!\p{L})totaux\s+scolaires(?!\p{L})/u, 'totaux scolaire', 'school_totals');
    alias(new RegExp(`كل\\s+واحد\\s+فسطر${end}`, 'u'), 'كل واحد في سطر', 'separate_lines_arabic');
    alias(new RegExp(`kol\\s+wa7d\\s+f\\s+ster${end}`, 'u'), 'kol wa7d f سطر', 'separate_lines_arabizi');
    // The original v3 veto runs first. Actual arithmetic/combined-result requests
    // cannot be rescued by appending a negated operation to their end.
    alias(new RegExp(`بلا\\s+ما\\s+تجمع\\s+العددين${end}`, 'u'), '', 'no_combination_darija');
    alias(new RegExp(`bla\\s+ma\\s+tjme3\\s+l3adadin${end}`, 'u'), '', 'no_combination_arabizi');
  }
  if (choice === 'class_list') {
    alias(new RegExp(`sans\\s+autre\\s+information${end}`, 'u'), 'sans information', 'classes_only_french');
    alias(new RegExp(`بلا\\s+معلومات\\s+اخرى${end}`, 'u'), 'بلا information', 'classes_only_darija');
    alias(new RegExp(`bla\\s+ma3lomat\\s+okhra${end}`, 'u'), 'bla information', 'classes_only_arabizi');
  }
  if (choice === 'attendance_today') {
    alias(/(?<!\p{L})المدرسة\s+باكملها(?!\p{L})/u, 'المدرسة كلها', 'whole_school_attendance');
  }
  if (choice === 'small_talk') {
    alias(/^شكرا\s+لمساعدتك(?!\p{L})/u, 'شكرا على المساعدة', 'thanks_for_help');
  }
  return { ...explainQueryVetoV4(text, choice), aliases };
}

export const queryVetoV5 = (query: string, choice: string) => explainQueryVetoV5(query, choice).veto;
