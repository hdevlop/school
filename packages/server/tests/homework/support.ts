import sharp from 'sharp';
import { HomeworkValidator } from '../../src/modules/homework/HomeworkValidator';

/** A validator whose refusals carry their catalog key, so a test can name the one it expects. */
export function homeworkValidator(repository: object = {}) {
  const validator = new HomeworkValidator(repository as never, {} as never);
  Object.defineProperty(validator, 'ht', { value: (key: string) => `homework.errors.${key}` });
  return validator;
}

/** An in-memory stand-in for najm-storage: what was saved, and when. */
export function memoryStorage(now = () => Date.now()) {
  const files = new Map<string, { bytes: Buffer; updatedAt: string }>();
  const saves: string[] = [];
  return {
    files,
    saves,
    getInfo: async (_namespace: string, path: string) => (files.has(path) ? { filePath: path } : null),
    save: async (_namespace: string, path: string, bytes: Buffer) => {
      saves.push(path);
      files.set(path, { bytes, updatedAt: new Date(now()).toISOString() });
    },
    get: async (_namespace: string, path: string) => files.get(path)?.bytes ?? null,
    delete: async (_namespace: string, path: string) => files.delete(path),
    list: async () => [...files].map(([filePath, file]) => ({ filePath, updatedAt: file.updatedAt })),
  };
}

/**
 * A phone photo: larger than the stored size, turned on its side by its EXIF
 * orientation, and carrying the place it was taken.
 */
export function phonePhoto({ width = 3000, height = 2000 } = {}) {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 180, b: 120 } } })
    .withExif({
      IFD0: { Make: 'TestPhone', Model: 'Synthetic 1' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '33/1 35/1 2200/100', GPSLongitudeRef: 'W', GPSLongitude: '7/1 36/1 1100/100' },
    })
    .withMetadata({ orientation: 6 })
    .jpeg({ quality: 90 })
    .toBuffer();
}

export const asFile = (bytes: Uint8Array, name: string, type = 'application/octet-stream') =>
  new File([new Uint8Array(bytes)], name, { type });

/** A PDF by its first bytes, which is all the server reads of it. */
export const pdfOfSize = (bytes: number) => Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(Math.max(0, bytes - 9), 0x20)]);
