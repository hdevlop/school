import { getSession } from '@/najm.server';

export const dynamic = 'force-dynamic';

// Image tags cannot send a bearer token. Reuse the app's session resolution
// before serving this fixed fee-type image path through the storage service.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return new Response(null, { status: 401 });

  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return new Response(null, { status: 404 });

  const [{ server }, { FeeTypeService }] = await Promise.all([
    import('@sms/server'),
    import('@sms/server/modules'),
  ]);
  await server.init();
  const service = await server.container.resolve(FeeTypeService);
  let image: Response;
  try {
    image = await service.serveImage(id);
  } catch (error) {
    const missing = error as { status?: number; code?: string };
    if (missing.status === 404 || missing.code === 'HTTP_404') return new Response(null, { status: 404 });
    throw error;
  }
  const headers = new Headers(image.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(image.body, { status: image.status, headers });
}
