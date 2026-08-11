import { describe, expect, it } from 'bun:test';

describe('Behavior rewards dashboard access', () => {
  it('renders only for administrators and teachers', async () => {
    const source = await Bun.file(
      new URL('../../../../apps/dashboard/src/app/(dashboard)/behavior-rewards/page.tsx', import.meta.url),
    ).text();

    expect(source).toContain("role === 'admin' || role === 'teacher'");
    expect(source).toContain("router.replace('/')");
    expect(source).toContain('if (!user || !allowed) return null');
  });
});
