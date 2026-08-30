import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

function hasRefreshToken(req: Request) {
  return /(?:^|;\s*)refreshToken=/.test(req.headers.get('cookie') ?? '');
}

function isSpeculativePrefetch(req: Request) {
  const headers = req.headers;
  const routerStateTree = headers.get('next-router-state-tree') ?? '';

  return (
    headers.get('next-router-prefetch') === '1' ||
    headers.get('purpose') === 'prefetch' ||
    headers.get('sec-purpose')?.includes('prefetch') ||
    routerStateTree.includes('metadata-only')
  );
}

export default async function proxy(req: Request) {
  if (hasRefreshToken(req) && isSpeculativePrefetch(req)) {
    return NextResponse.next();
  }

  return auth.proxy(req);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|images|storage|.*\\.(?:css|js|map|json|txt|xml|ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|webmanifest)$).*)',
  ],
};
