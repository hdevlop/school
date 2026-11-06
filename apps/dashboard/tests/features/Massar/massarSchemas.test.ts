import { describe, expect, it } from 'bun:test';
import { massarEntrySchema } from '../../../src/features/Massar/config/massarSchemas';
describe('Massar mark entry', () => {
  for (const max of [10,20]) it(`validates the /${max} range and absence exclusivity`, () => {
    const schema = massarEntrySchema(max);
    for (const mark of [0, 0.25, 7.55, max]) expect(schema.safeParse({ mark, absence: 'none' }).success).toBe(true);
    for (const mark of [-1, max + 0.01, NaN, Infinity]) expect(schema.safeParse({ mark, absence: 'none' }).success).toBe(false);
    expect(schema.safeParse({ mark: null, absence: 'justified' }).success).toBe(true);
    expect(schema.safeParse({ mark: 0, absence: 'justified' }).success).toBe(false);
  });
});
