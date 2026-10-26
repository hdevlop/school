import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import { createFeeTypeDto, updateFeeTypeDto } from '../../src/modules/financial/feeTypes/FeeTypeDto';
import { FeeTypeService } from '../../src/modules/financial/feeTypes/FeeTypeService';
import { FeeTypeValidator } from '../../src/modules/financial/feeTypes/FeeTypeValidator';
import { withEnglishMessages } from '../support/englishMessages';

function harness() {
  let saved: any;
  const uploads: Array<{ namespace: string; input: unknown; filePath: string }> = [];
  const removed: Array<[string, string]> = [];
  const repository = {
    getById: async () => saved,
    getByName: async () => null,
    isInUse: async () => false,
    create: async (data: any) => { saved = { ...data }; return saved; },
    update: async (_id: string, data: any) => { saved = { ...saved, ...data }; return saved; },
    delete: async () => saved,
  };
  const storage = {
    processFile: async (namespace: string, input: any, { filePath }: { filePath: string }) => {
      if (input instanceof Blob) {
        uploads.push({ namespace, input, filePath });
        return `/api/${namespace}/files/serve/${filePath}`;
      }
      return input ?? null;
    },
    delete: async (namespace: string, path: string) => { removed.push([namespace, path]); return true; },
    serveFile: async () => new Response('image', { headers: { 'Content-Type': 'image/png' } }),
  };
  const validator = withEnglishMessages(new FeeTypeValidator(repository as any));
  return { service: new FeeTypeService(repository as any, validator, storage as any), repository, uploads, removed };
}

const details = { name: 'Atelier robotique', category: 'technology', amount: 400, paymentType: 'recurring' as const };
const image = () => new File(['image'], 'fee.png', { type: 'image/png' });

describe('fee type images', () => {
  it('keeps REST image paths and null clearing compatible with MCP JSON Schema', () => {
    expect(() => z.toJSONSchema(createFeeTypeDto)).not.toThrow();
    expect(() => z.toJSONSchema(updateFeeTypeDto)).not.toThrow();
    expect(createFeeTypeDto.parse({ ...details, image: '/images/fee.png' }).image).toBe('/images/fee.png');
    expect(updateFeeTypeDto.parse({ image: null })).toEqual({ image: null });
    expect(updateFeeTypeDto.parse({ status: 'inactive' })).not.toHaveProperty('image');
  });

  it('uploads once, preserves images on scalar edits, refreshes replacements, and clears only its own file', async () => {
    const { service, uploads, removed } = harness();
    const uploaded = image();
    const created = await service.create({ ...details, image: uploaded });
    expect(created.image).toStartWith(`/api/fee-type-images/${created.id}?v=`);
    expect(uploads).toEqual([{ namespace: 'fee-types', input: uploaded, filePath: `${created.id}_icon.png` }]);

    const disabled = await service.update(created.id, { status: 'inactive' });
    expect(disabled.image).toBe(created.image);
    expect(uploads).toHaveLength(1);
    const retained = await service.update(created.id, { image: created.image, amount: 450 });
    expect(retained.image).toBe(created.image);
    expect(retained.status).toBe('inactive');
    expect(uploads).toHaveLength(1);

    const replaced = await service.update(created.id, { image: image() });
    expect(replaced.image).not.toBe(created.image);
    expect(replaced.image.split('?')[0]).toBe(created.image.split('?')[0]);
    expect(uploads).toHaveLength(2);
    expect(removed).toEqual([]);
    const cleared = await service.update(created.id, { image: null });
    expect(cleared.image).toBeNull();
    expect(cleared.status).toBe('inactive');
    expect(removed).toEqual([['fee-types', `${created.id}_icon.png`]]);
    expect((await service.serveImage(created.id)).status).toBe(404);
  });

  it('cleans up a new upload if creating the record fails', async () => {
    const { service, repository, uploads, removed } = harness();
    repository.create = async () => { throw new Error('insert failed'); };
    await expect(service.create({ ...details, image: image() })).rejects.toThrow('insert failed');
    expect(uploads).toHaveLength(1);
    expect(removed).toEqual([['fee-types', uploads[0].filePath]]);
  });

  it('rejects non-image multipart files before uploading or creating anything', async () => {
    const { service, uploads } = harness();
    const file = new File(['document'], 'fee.pdf', { type: 'application/pdf' });
    await expect(service.create({ ...details, image: file })).rejects.toMatchObject({ status: 400, message: 'Please upload an image file' });
    expect(uploads).toEqual([]);
  });

  it('removes its uploaded icon when deleting the fee type', async () => {
    const { service, removed } = harness();
    const created = await service.create({ ...details, image: image() });
    await service.delete(created.id);
    expect(removed).toEqual([['fee-types', `${created.id}_icon.png`]]);
  });
});
