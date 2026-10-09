import { normalizeReplyText } from 'najm-chatbot';
export const canonical = (value: string) => normalizeReplyText(value).replace(/[.!?؟]+$/u, '').trim();
export type Row = Record<string, unknown>;
export function records(value: unknown): Row[] {
  if (!Array.isArray(value)) throw Error('Invalid filtered reply result');
  const seen = new Set<string>();
  return value.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)
      || typeof item.id !== 'string' || !item.id.trim() || seen.has(item.id)) throw Error('Invalid filtered reply row');
    seen.add(item.id); return item as Row;
  });
}
export function safeName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || /[\r\n]/u.test(value)) throw Error('Invalid filtered reply name');
  return value.trim();
}
export function validDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw Error('Invalid filtered reply date');
  return value;
}
export const subjectName = (value: string) => canonical(value).normalize('NFD').replace(/\p{M}/gu, '');
