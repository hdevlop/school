import sharp from 'sharp';

const ICON_SIZES = { '180.png': 180, '192.png': 192, '512.png': 512 } as const;

export function pwaIconSize(file: string) {
  return Object.hasOwn(ICON_SIZES, file) ? ICON_SIZES[file as keyof typeof ICON_SIZES] : null;
}

/** Fit the existing school mark without cropping; installed icons are opaque. */
export function renderPwaIcon(input: Uint8Array, size: 180 | 192 | 512) {
  return sharp(input)
    .autoOrient()
    .resize(size, size, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer();
}
