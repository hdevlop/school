import { NextResponse } from 'next/server';

import {
  isSchoolTimeZone,
  normalizeSchoolTimeZone,
  type SchoolTimeZone,
} from '@/preferences';
import { SCHOOL_UI_COOKIES, SCHOOL_UI_COOKIE_OPTIONS } from '@/preferences/cookies';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const timeZone = body && typeof body === 'object' && 'timeZone' in body
    ? (body as { timeZone?: unknown }).timeZone
    : undefined;

  if (!isSchoolTimeZone(timeZone)) {
    return NextResponse.json({ message: 'Unsupported time zone.' }, { status: 400 });
  }

  const normalized = normalizeSchoolTimeZone(timeZone);
  const response = NextResponse.json({ timeZone: normalized });
  response.cookies.set(
    SCHOOL_UI_COOKIES.timeZone,
    normalized satisfies SchoolTimeZone,
    SCHOOL_UI_COOKIE_OPTIONS,
  );
  return response;
}

/** Cleared on sign-out, alongside the language and theme preferences. */
export async function DELETE() {
  const response = NextResponse.json({ cleared: true });
  response.cookies.delete({ name: SCHOOL_UI_COOKIES.timeZone, path: '/' });
  return response;
}
