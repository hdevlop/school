import { describe, expect, it } from 'bun:test';
import { MARITAL_STATUS_VALUES, RELATIONSHIP_TYPE_VALUES } from '@sms/contracts';

import {
  buildMaritalStatusOptions,
  buildMaritalStatusOptionsFor,
  buildRelationshipTypeOptions,
  buildRelationshipTypeOptionsFor,
} from './parentOptions';

const echo = (key: string) => key;

describe('parent option builders', () => {
  it('offers exactly what the API accepts, in contract order', () => {
    expect(buildRelationshipTypeOptions(echo).map((o) => o.value)).toEqual([
      ...RELATIONSHIP_TYPE_VALUES,
    ]);
    expect(buildMaritalStatusOptions(echo).map((o) => o.value)).toEqual([
      ...MARITAL_STATUS_VALUES,
    ]);
  });

  it('labels each value from the prefix the profile screens already use', () => {
    expect(buildRelationshipTypeOptions(echo)[0]).toEqual({
      value: 'father',
      label: 'parents.relationships.father',
    });
    expect(buildMaritalStatusOptions(echo)[0]).toEqual({
      value: 'single',
      label: 'parents.maritalStatus.single',
    });
  });
});

describe('editing a record with an unfamiliar stored value', () => {
  it('appends the stored value so the field is not silently blank', () => {
    const options = buildRelationshipTypeOptionsFor(echo, 'foster_carer');

    expect(options).toHaveLength(RELATIONSHIP_TYPE_VALUES.length + 1);
    expect(options.at(-1)).toEqual({
      value: 'foster_carer' as never,
      label: 'parents.relationships.foster_carer',
    });
  });

  it('changes nothing when the stored value is one we already offer', () => {
    expect(buildRelationshipTypeOptionsFor(echo, 'guardian')).toHaveLength(
      RELATIONSHIP_TYPE_VALUES.length,
    );
    expect(buildMaritalStatusOptionsFor(echo, 'married')).toHaveLength(
      MARITAL_STATUS_VALUES.length,
    );
  });

  it('changes nothing for a new record with no value yet', () => {
    for (const empty of [undefined, null, '']) {
      expect(buildMaritalStatusOptionsFor(echo, empty)).toHaveLength(MARITAL_STATUS_VALUES.length);
    }
  });
});
