import shipped from './semantics.json';
import grades from './semantics/grades.json';

/**
 * Every routing phrase School ships, passed to najm-rag as `seedSemantics`:
 * the original catalog plus one file per feature in `semantics/`, written as
 * docs/chat-routing describes. A new feature file is added to FEATURES; the
 * routing semantics test fails on a file left out.
 */
export const FEATURES = { grades } as const;

export const seedSemantics = {
  items: [...shipped.items, ...Object.values(FEATURES).flatMap((feature) => feature.items)],
};
