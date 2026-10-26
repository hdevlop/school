import { describe, expect, it } from 'bun:test';
import { FeeTypeService } from '../../src/modules/financial/feeTypes/FeeTypeService';
import { FeeTypeValidator } from '../../src/modules/financial/feeTypes/FeeTypeValidator';
import { withEnglishMessages } from '../support/englishMessages';

function service(inUse: boolean) {
  const deleted: string[] = [];
  const repository = {
    getById: async (id: string) => ({ id }),
    isInUse: async () => inUse,
    delete: async (id: string) => { deleted.push(id); return { id }; },
  };
  const validator = withEnglishMessages(new FeeTypeValidator(repository as any));
  return { service: new FeeTypeService(repository as any, validator, {
    delete: async () => true,
  } as any), deleted };
}

describe('deleting a fee type', () => {
  // The fee foreign key restricts the delete; without this check the database
  // refused it and the API answered 500 with the SQL statement.
  it('refuses a type that student fees use with a translated 409', async () => {
    const { service: feeTypes, deleted } = service(true);
    await expect(feeTypes.delete('FT01')).rejects.toMatchObject({
      status: 409,
      message: 'Student fees use this fee type, so it cannot be deleted',
    });
    expect(deleted).toEqual([]);
  });

  it('deletes a type no fee uses', async () => {
    const { service: feeTypes, deleted } = service(false);
    await feeTypes.delete('FT01');
    expect(deleted).toEqual(['FT01']);
  });
});
