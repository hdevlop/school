/**
 * Shrinks a photo in the browser before it is uploaded: a phone photo of 4 to
 * 8 MB becomes a few hundred KB, which matters on a mobile connection and on
 * a shared disk. This is a convenience, not a rule: the server processes
 * whatever arrives again and decides what is stored.
 */

export type CompressImageOptions = {
  /** Longest edge of the result, in pixels. */
  maxEdge: number;
  /** 0 to 1. */
  webpQuality?: number;
  jpegQuality?: number;
};

type Size = { width: number; height: number };

/** The size that fits `maxEdge` without enlarging and without changing the proportions. */
export function fitWithin({ width, height }: Size, maxEdge: number): Size {
  const longest = Math.max(width, height);
  if (!longest || longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

const EXTENSIONS: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg' };

/** The file's name with the extension of what it now holds. */
export function renamedFor(name: string, mimeType: string) {
  const extension = EXTENSIONS[mimeType];
  if (!extension) return name;
  const stem = name.replace(/\.[^./\\]+$/, '') || 'photo';
  return `${stem}.${extension}`;
}

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * The image re-encoded as WebP (JPEG where the browser cannot write WebP),
 * upright and no larger than `maxEdge`. Anything that is not an image, or
 * that the browser cannot decode, is returned as it was, and so is an image
 * that was already smaller than its re-encoding.
 */
export async function compressImage(file: File, { maxEdge, webpQuality = 0.75, jpegQuality = 0.8 }: CompressImageOptions): Promise<File> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') return file;
  let bitmap: ImageBitmap;
  try {
    // 'from-image' applies the EXIF orientation, so a phone photo is not sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  try {
    const { width, height } = fitWithin(bitmap, maxEdge);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);

    // A browser without a WebP encoder answers with a PNG instead of failing.
    let blob = await encode(canvas, 'image/webp', webpQuality);
    if (blob?.type !== 'image/webp') blob = await encode(canvas, 'image/jpeg', jpegQuality);
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], renamedFor(file.name, blob.type), { type: blob.type, lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}
