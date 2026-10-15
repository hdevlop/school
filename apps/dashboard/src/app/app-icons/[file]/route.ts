import { loadUiSnapshot } from '@/najm.server';
import { pwaIconSize, renderPwaIcon } from '@/lib/pwaIcon';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const size = pwaIconSize((await params).file);
  if (!size) return new Response(null, { status: 404 });

  const { branding } = await loadUiSnapshot();
  const source = branding.slots.authLogo ?? branding.slots.sidebarLogoCollapsed;
  // Branding is owned by Najm. Resolve its public asset in-process rather than
  // fetching a host supplied in a request or introducing a second logo store.
  if (!source || !/^\/api\/branding\/(?:assets|factory)\/[^/?#]+$/.test(source)) {
    throw new Error('The app icon requires a School branding asset.');
  }
  const { server } = await import('@sms/server');
  const image = await server.fetch(new Request(`http://school.internal${source}`));
  if (!image.ok) return new Response(null, { status: 502 });
  const png = await renderPwaIcon(new Uint8Array(await image.arrayBuffer()), size);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
