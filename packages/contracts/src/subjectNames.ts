/**
 * How School compares subject and sub-subject names: case, accents, extra
 * spaces and the Arabic letter forms people type interchangeably (أ إ آ → ا,
 * ة → ه) do not make two names different. Planning finds a subject by name.
 */
export const foldSubjectName = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').trim().toLowerCase().replace(/\s+/g, ' ');
