import { expect, test } from 'bun:test';
import { classifyToolOffer } from '../chatbot-darija-tool-offers-report.mjs';
const row = { toolPlanChecksPassed: false, expectation: { requiredToolGroups: [['count', 'equivalent'], ['lookup']] } };
test('distinguishes an unavailable required tool from a wrong plan with offered tools', () => {
  expect(classifyToolOffer(row, ['count']).category).toBe('required_tools_missing_from_offer');
  expect(classifyToolOffer(row, ['equivalent', 'lookup']).category).toBe('required_tools_offered_but_plan_failed');
});
test('an unobserved offer is not an empty shortlist', () => {
  expect(classifyToolOffer(row, null).category).toBe('offer_unobserved');
  expect(classifyToolOffer(row, []).category).toBe('required_tools_missing_from_offer');
});
