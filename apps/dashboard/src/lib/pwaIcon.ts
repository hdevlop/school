import sharp from 'sharp';

type IconSize = 32 | 180 | 192 | 512;
type IconSpec = { size: IconSize; maskable: boolean };

const ICONS: Record<string, IconSpec> = {
  '32.png': { size: 32, maskable: false },
  '180.png': { size: 180, maskable: false },
  '192.png': { size: 192, maskable: false },
  '512.png': { size: 512, maskable: false },
  // Android crops app icons to its own shape (circle, squircle...). A maskable
  // icon keeps the logo inside the central safe circle, 80% of the width.
  'maskable-192.png': { size: 192, maskable: true },
  'maskable-512.png': { size: 512, maskable: true },
};

export function pwaIcon(file: string): IconSpec | null {
  return Object.hasOwn(ICONS, file) ? ICONS[file] : null;
}

export function pwaIconSize(file: string) {
  return pwaIcon(file)?.size ?? null;
}

/** Fit the existing school mark without cropping; installed icons are opaque. */
export async function renderPwaIcon(input: Uint8Array, size: IconSize, { maskable = false } = {}) {
  // The largest square inside the safe circle (diameter 0.8 × size).
  const inner = maskable ? Math.floor((size * 0.8) / Math.SQRT2) : size;
  const logo = await sharp(input)
    .autoOrient()
    .resize(inner, inner, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer();
  if (!maskable) return logo;
  const start = Math.floor((size - inner) / 2);
  const end = size - inner - start;
  return sharp(logo)
    .extend({ top: start, left: start, bottom: end, right: end, background: '#ffffff' })
    .png()
    .toBuffer();
}
