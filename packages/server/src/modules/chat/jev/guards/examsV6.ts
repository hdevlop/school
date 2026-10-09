/** Closed unfiltered exam requests. Names, dates and extra clauses stay on the fallback. */
export function examReplyKindV6(query: string): 'next' | 'list' | null {
  const text = query.normalize('NFKD').toLowerCase().replace(/[\p{M}\u0640]/gu, '')
    .replace(/[.!?؟]+$/u, '').replace(/\s+/gu, ' ').trim();
  if (/^(?:امتى الفرض الجاي|imta lfard jay)$/u.test(text)) return 'next';
  if (/^(?:وريني التواريخ ديال الفروض الجايين فالمدرسة كاملة|werini tawarikh dyal lforod jayin f lmdrasa kamla|واش كاينين شي فروض هاد الايام الجاية|wach kaynin chi forod had liyam jaya|شنو هوما الامتحانات اللي جايين|ما هي الامتحانات القادمة)$/u.test(text)) return 'list';
  return null;
}
