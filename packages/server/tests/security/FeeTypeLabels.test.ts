import { describe, expect, it } from 'bun:test';
import { createFeeTypeDto, updateFeeTypeDto } from '../../src/modules/financial/feeTypes/FeeTypeDto';
import { FeeTypeService } from '../../src/modules/financial/feeTypes/FeeTypeService';

const labels = { en: 'Tuition Fee', fr: 'Frais de scolarité', ar: 'الرسوم الدراسية', es: 'Cuota de escolaridad' };
const feeType = { name: labels.fr, category: 'tuition', amount: 1100, labels };

describe('fee type translated names', () => {
  it('validates translations and remains compatible with records without them', () => {
    expect(createFeeTypeDto.parse(feeType).labels).toEqual(labels);
    expect(createFeeTypeDto.safeParse({ ...feeType, labels: undefined }).success).toBe(true);
    expect(updateFeeTypeDto.parse({ labels: null })).toEqual({ labels: null });
    expect(updateFeeTypeDto.parse({ labels: { ar: ' رسوم التسجيل ' } }).labels).toEqual({ ar: 'رسوم التسجيل' });
    expect(createFeeTypeDto.safeParse({ ...feeType, labels: { fr: ' ' } }).success).toBe(false);
    expect(createFeeTypeDto.safeParse({ ...feeType, labels: { fr: 'x'.repeat(101) } }).success).toBe(false);
  });

  it('persists labels through create and edits while unrelated edits preserve them', async () => {
    let saved: Record<string, unknown> = {};
    const repository = {
      create: async (data: object) => { saved = { id: 'fee-type', ...data }; return saved; },
      update: async (_id: string, data: object) => { saved = { ...saved, ...data }; return saved; },
    };
    const service = new FeeTypeService(repository as any, { validate: async () => {} } as any, {
      processFile: async () => null,
    } as any);
    await service.create(createFeeTypeDto.parse(feeType));
    expect(saved.labels).toEqual(labels);
    await service.update('fee-type', updateFeeTypeDto.parse({ amount: 1200 }));
    expect(saved.labels).toEqual(labels);
    await service.update('fee-type', updateFeeTypeDto.parse({ labels: { ...labels, ar: 'رسوم الدراسة' } }));
    expect(saved.labels).toEqual({ ...labels, ar: 'رسوم الدراسة' });
    expect(saved.name).toBe(labels.fr);
    await service.update('fee-type', updateFeeTypeDto.parse({ labels: null }));
    expect(saved.labels).toBeNull();
  });
});
