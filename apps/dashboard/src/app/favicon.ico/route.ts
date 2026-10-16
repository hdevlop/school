import { GET as appIcon } from '../app-icons/[file]/route';

export const dynamic = 'force-dynamic';

/**
 * Browsers and crawlers still ask for /favicon.ico whatever the page declares.
 * Answer with the same branded 32px PNG the layout names as its icon, instead
 * of a 404 logged on every page.
 */
export function GET(request: Request) {
  return appIcon(request, { params: Promise.resolve({ file: '32.png' }) });
}
