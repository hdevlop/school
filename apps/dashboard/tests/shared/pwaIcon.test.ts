import { describe, expect, it } from 'bun:test';
import sharp from 'sharp';
import { pwaIconSize, renderPwaIcon } from '@/lib/pwaIcon';

describe('install icons', () => {
  it.each(['256.png', 'constructor', '__proto__', '../192.png', '192.svg', '192.png?url=https://outside.example'])('rejects unsupported filenames: %s', (file) => {
    expect(pwaIconSize(file)).toBeNull();
  });

  it.each([180, 192, 512] as const)('renders a real opaque %i square PNG from the bundled school logo', async (size) => {
    const input = new Uint8Array(await Bun.file('packages/server/src/theme/sidebar-logo-collapsed.png').arrayBuffer());
    const output = await renderPwaIcon(input, size);
    expect(pwaIconSize(`${size}.png`)).toBe(size);
    const image = await sharp(output).metadata();
    expect(image).toMatchObject({ format: 'png', width: size, height: size, hasAlpha: false });
  });

  it('preserves a wide school logo without cropping and fills the remaining space with white', async () => {
    const input = await sharp({ create: { width: 200, height: 100, channels: 4, background: '#ff0000' } }).png().toBuffer();
    const png = await renderPwaIcon(input, 192);
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
    expect(pixel(0, 0)).toEqual([255, 255, 255]);
    expect(pixel(0, 96)).toEqual([255, 0, 0]);
    expect(pixel(191, 96)).toEqual([255, 0, 0]);
  });
});
