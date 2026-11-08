import { expect, it } from 'bun:test';
import { resolveRoundLabels } from '../../src/modules/massar/roundLabels';
import { massarRoundDto } from '../../src/modules/massar/MassarDto';

it('takes exact labels from imported evidence and uses standard Arabic only when unseen', () => {
  const source = { observedRounds: [{ term: 1, exam: 1, termLabel: 'الدورة الأولى ', examLabel: 'الفرض الأول ', components: [] }] };
  expect(resolveRoundLabels([source], 1, 1)).toEqual({ termLabel: 'الدورة الأولى ', examLabel: 'الفرض الأول ', labelsUnseen: false });
  expect(resolveRoundLabels([source], 2, 2)).toEqual({ termLabel: 'الدورة الثانية', examLabel: 'الفرض الثاني', labelsUnseen: true });
  expect(massarRoundDto.parse({ term: 1, exam: 1, termLabel: 'user text', examLabel: 'user text' })).toEqual({ term: 1, exam: 1 });
  expect(massarRoundDto.safeParse({ term: 1, exam: 9 }).success).toBe(false);
});
