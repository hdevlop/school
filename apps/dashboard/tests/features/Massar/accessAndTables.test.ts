import { expect, it } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { PAGE_ACCESS } from '@/shared/pageAccess';
import { createSidebarItems } from '@/shared/schoolNavigation';
const viewer = (role: string, permissions: string[]) => ({ role, can: (name: string) => permissions.includes(name) });
it('shows the registrar three destinations, teachers one, supervisors two, and families none', () => {
  const registrar = viewer('registrar', ['read:massar','manage:massar']);
  const teacher = viewer('teacher', ['read:massar','update:massar-marks']);
  const supervisor = viewer('supervisor', ['read:massar']);
  const links = (role: typeof registrar) => createSidebarItems(key => key, role).flatMap(item => item.children?.map(child => child.href) ?? [item.href]).filter(href => href?.startsWith('/massar'));
  expect(links(registrar)).toEqual(['/massar/rounds','/massar/sheets','/massar/setup']);
  expect(links(teacher)).toEqual(['/massar/sheets']); expect(links(supervisor)).toEqual(['/massar/rounds','/massar/sheets']);
  for (const role of ['parent','student']) { expect(links(viewer(role, ['read:massar']))).toEqual([]); expect(PAGE_ACCESS.massarSheets(viewer(role, ['read:massar']))).toBe(false); }
  expect(PAGE_ACCESS.massarSetup(teacher)).toBe(false); expect(PAGE_ACCESS.massarSetup(supervisor)).toBe(false);
});
it('renders a failed table load as an error without an empty count', () => {
  const result = Bun.spawnSync([process.execPath, fileURLToPath(new URL('./tableFailure.fixture.tsx', import.meta.url))], { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' });
  expect(result.stderr.toString()).toBe(''); expect(result.exitCode).toBe(0); expect(result.stdout.toString()).toContain('Massar failures stay visible');
}, 15000);
