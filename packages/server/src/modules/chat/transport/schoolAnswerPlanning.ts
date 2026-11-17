/**
 * OSS20B sometimes writes its English planning into the answer itself, glued
 * to the real answer: "We need to answer in Darija. Provide grades list.**نتائج
 * ...", or "... We can explain cannot retrieve.Je suis désolé, ...". Seen in 3
 * of 180 real chat answers (2026-11-16); one was planning only and named tools.
 *
 * Only an answer that opens with a planning cue is touched. Its planning ends
 * where a sentence is glued to the next one with no space; what follows is
 * the answer. An opening cue with tool names and no glued answer is planning
 * only, and the reply fails like any failed generation instead of showing it.
 */

// How the leaked planning opened; an ordinary answer does not start this way.
const PLANNING_OPENING = /^\s*(?:we need|we should|we must|we can(?:not|'t)? (?:call|use|answer|explain|find)|we don't|let's|let me|the user (?:asks|wants|is asking|requests)|user (?:asks|wants)|need to|i need to|i should|now we|so we|first,? we)\b/i;
// A sentence end glued to the next sentence: "list.**", "find.ما", "retrieve.Je".
const GLUED_SENTENCE = /(?<![\p{N}])[.?!](?=[^\s\p{N}.?!)\]"'»”’])/u;
const TOOL_NAME = /\b[a-z][a-z-]*_[a-z_]*get[a-z_]*\b|\bcall (?:the )?tool\b/;

export type PlanningCheck = { text: string } | { planningOnly: true };

/** The answer without leaked planning; `planningOnly` when nothing else is there. */
export function withoutLeakedPlanning(answer: string): PlanningCheck {
  if (!PLANNING_OPENING.test(answer)) return { text: answer };
  let rest = answer, cut = false;
  for (let glued = GLUED_SENTENCE.exec(rest); glued; glued = GLUED_SENTENCE.exec(rest)) {
    rest = rest.slice(glued.index + 1).trimStart();
    cut = true;
    if (rest && !PLANNING_OPENING.test(rest)) return { text: rest };
  }
  return cut || TOOL_NAME.test(answer) ? { planningOnly: true } : { text: answer };
}
