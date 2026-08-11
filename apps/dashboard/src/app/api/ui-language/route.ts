import { NextResponse } from 'next/server';

import { isSchoolLanguage, type SchoolLanguage } from '@/preferences';
import { SCHOOL_UI_COOKIES, SCHOOL_UI_COOKIE_OPTIONS } from '@/preferences/cookies';

/**
 * The immediate render preference only.
 *
 * School already owns an authenticated user-language service
 * (`PUT /users/language`, driven by `useUpdateLang`), and that stays the single
 * writer of the database preference: it is the record that survives a cleared
 * cookie and a new device, and it is guarded by a session this handler
 * deliberately does not require.
 *
 * This cookie exists for the one thing the database row cannot do — be readable
 * by the root Server Component before React renders, including for an anonymous
 * visitor on the login screen. Writing the user row from here as well would give
 * one preference two writers with different authorization.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const language = body && typeof body === 'object' && 'language' in body
    ? (body as { language?: unknown }).language
    : undefined;

  if (!isSchoolLanguage(language)) {
    return NextResponse.json({ message: 'Unsupported language.' }, { status: 400 });
  }

  const response = NextResponse.json({ language });
  response.cookies.set(
    SCHOOL_UI_COOKIES.language,
    language satisfies SchoolLanguage,
    SCHOOL_UI_COOKIE_OPTIONS,
  );
  return response;
}

/**
 * Cleared on sign-out. The cookie outranks the signed-in user's stored
 * preference by design — it is the more recent explicit choice — so leaving it
 * behind would render the next person's session in the previous person's
 * language on a shared machine.
 */
export async function DELETE() {
  const response = NextResponse.json({ cleared: true });
  response.cookies.delete({ name: SCHOOL_UI_COOKIES.language, path: '/' });
  return response;
}
