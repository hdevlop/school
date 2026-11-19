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

/** A number of quarter turns clockwise, as 0, 1, 2 or 3. */
export const normalizeTurns = (quarterTurns: number) => ((Math.round(quarterTurns) % 4) + 4) % 4;

/** The size of a picture after it was turned: an odd number of quarter turns swaps the sides. */
export function rotatedSize({ width, height }: Size, quarterTurns: number): Size {
  return normalizeTurns(quarterTurns) % 2 ? { width: height, height: width } : { width, height };
}

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

type RenderOptions = { maxEdge: number; quarterTurns: number; webpQuality: number; jpegQuality: number };

/**
 * The image decoded upright, reduced, turned and re-encoded as WebP (JPEG
 * where the browser cannot write WebP), or null when the browser cannot.
 */
async function render(source: Blob, { maxEdge, quarterTurns, webpQuality, jpegQuality }: RenderOptions): Promise<Blob | null> {
  if (typeof createImageBitmap !== 'function') return null;
  let bitmap: ImageBitmap;
  try {
    // 'from-image' applies the EXIF orientation, so a phone photo is not sideways.
    bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  } catch {
    return null;
  }
  try {
    const turns = normalizeTurns(quarterTurns);
    const drawn = fitWithin(bitmap, maxEdge);
    const { width, height } = rotatedSize(drawn, turns);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    // Turn around the centre, then draw the unturned picture centred on it.
    context.translate(width / 2, height / 2);
    context.rotate((turns * Math.PI) / 2);
    context.drawImage(bitmap, -drawn.width / 2, -drawn.height / 2, drawn.width, drawn.height);

    // A browser without a WebP encoder answers with a PNG instead of failing.
    let blob = await encode(canvas, 'image/webp', webpQuality);
    if (blob?.type !== 'image/webp') blob = await encode(canvas, 'image/jpeg', jpegQuality);
    return blob;
  } finally {
    bitmap.close();
  }
}

/**
 * The image re-encoded as WebP (JPEG where the browser cannot write WebP),
 * upright and no larger than `maxEdge`. Anything that is not an image, or
 * that the browser cannot decode, is returned as it was, and so is an image
 * that was already smaller than its re-encoding.
 */
export async function compressImage(file: File, { maxEdge, webpQuality = 0.75, jpegQuality = 0.8 }: CompressImageOptions): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  const blob = await render(file, { maxEdge, quarterTurns: 0, webpQuality, jpegQuality });
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], renamedFor(file.name, blob.type), { type: blob.type, lastModified: file.lastModified });
}

/**
 * The image turned by quarter turns clockwise, for a photo whose pixels are
 * sideways with nothing in the file to say so (a phone held sideways with
 * rotation locked, or a photo forwarded by a messaging app that drops EXIF):
 * the browser cannot tell, the person can. Turn from the original each time,
 * not from the last result, so turning twice does not re-encode twice.
 * Null when the browser cannot decode it.
 */
export async function rotateImage(
  source: Blob,
  name: string,
  quarterTurns: number,
  { maxEdge, webpQuality = 0.85, jpegQuality = 0.9 }: CompressImageOptions,
): Promise<File | null> {
  const blob = await render(source, { maxEdge, quarterTurns, webpQuality, jpegQuality });
  if (!blob) return null;
  return new File([blob], renamedFor(name, blob.type), { type: blob.type, lastModified: Date.now() });
}
