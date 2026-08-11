import { NextResponse } from 'next/server';

import { isSchoolTheme, type SchoolTheme } from '@/preferences';
import { SCHOOL_UI_COOKIES, SCHOOL_UI_COOKIE_OPTIONS } from '@/preferences/cookies';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const theme = body && typeof body === 'object' && 'theme' in body
    ? (body as { theme?: unknown }).theme
    : undefined;

  if (!isSchoolTheme(theme)) {
    return NextResponse.json({ message: 'Unsupported color theme.' }, { status: 400 });
  }

  const response = NextResponse.json({ theme });
  response.cookies.set(
    SCHOOL_UI_COOKIES.theme,
    theme satisfies SchoolTheme,
    SCHOOL_UI_COOKIE_OPTIONS,
  );
  return response;
}

/** Cleared on sign-out, alongside the language and time-zone preferences. */
export async function DELETE() {
  const response = NextResponse.json({ cleared: true });
  response.cookies.delete({ name: SCHOOL_UI_COOKIES.theme, path: '/' });
  return response;
}
