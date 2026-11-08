import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

const receiptDto = z.object({
  yearId: z.string(), roundId: z.string(), downloadedAt: z.iso.datetime(),
  sheets: z.array(z.object({ id: z.string(), revision: z.number().int().nonnegative() })).min(1).max(400),
});
export type ExportReceipt = z.infer<typeof receiptDto>;
function signature(payload: string) {
  const key = process.env.JWT_ACCESS_SECRET;
  if (!key) throw new Error('JWT_ACCESS_SECRET is required');
  return createHmac('sha256', key).update(`massar-download:${payload}`).digest();
}
/** A signed snapshot survives refresh without storing another copy of student data. */
export function signExportReceipt(receipt: ExportReceipt) {
  const payload = deflateRawSync(Buffer.from(JSON.stringify(receiptDto.parse(receipt)))).toString('base64url');
  return `${payload}.${signature(payload).toString('base64url')}`;
}
export function readExportReceipt(token: string): ExportReceipt | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const expected = signature(parts[0]), actual = Buffer.from(parts[1], 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try { return receiptDto.parse(JSON.parse(inflateRawSync(Buffer.from(parts[0], 'base64url'), { maxOutputLength: 100000 }).toString('utf8'))); }
  catch { return null; }
}
