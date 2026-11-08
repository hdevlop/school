import { expect, it } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { PAGE_ACCESS } from '@/shared/pageAccess';
import { createSidebarItems } from '@/shared/schoolNavigation';
const viewer = (role: string, permissions: string[]) => ({ role, can: (name: string) => permissions.includes(name) });
it('shows one Massar link to allowed roles, and the Massar settings in Académique to managers only', () => {
  const registrar = viewer('registrar', ['read:massar','manage:massar']);
  const teacher = viewer('teacher', ['read:massar','update:massar-marks']);
  const supervisor = viewer('supervisor', ['read:massar']);
  const links = (role: typeof registrar) => createSidebarItems(key => key, role).flatMap(item => item.children?.map(child => child.href) ?? [item.href]).filter(href => href?.startsWith('/massar'));
  expect(links(registrar)).toEqual(['/massar', '/massar-settings']);
  expect(links(teacher)).toEqual(['/massar']); expect(links(supervisor)).toEqual(['/massar']);
  for (const role of ['monitor','parent','student']) { expect(links(viewer(role, ['read:massar']))).toEqual([]); expect(PAGE_ACCESS.massarSheets(viewer(role, ['read:massar']))).toBe(false); }
  expect(PAGE_ACCESS.massarSetup(teacher)).toBe(false); expect(PAGE_ACCESS.massarSetup(supervisor)).toBe(false);
});
it('renders a failed table load as an error without an empty count', () => {
  const result = Bun.spawnSync([process.execPath, fileURLToPath(new URL('./tableFailure.fixture.tsx', import.meta.url))], { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' });
  expect(result.stderr.toString()).toBe(''); expect(result.exitCode).toBe(0); expect(result.stdout.toString()).toContain('Massar failures stay visible');
}, 15000);
it('renders the compact import flow and preserves its confirmation and role gates', () => {
  const result = Bun.spawnSync([process.execPath, fileURLToPath(new URL('./uiLayout.fixture.tsx', import.meta.url))], { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' });
  expect(result.stderr.toString()).toBe(''); expect(result.exitCode).toBe(0);
  expect(result.stdout.toString()).toContain('Massar page states and role-specific UI render correctly');
}, 15000);
it('renders editable paper and read-only supervisor and sent-sheet variants', () => {
  const result = Bun.spawnSync([process.execPath, fileURLToPath(new URL('./paper.fixture.tsx', import.meta.url))], { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' });
  expect(result.stderr.toString()).toBe(''); expect(result.exitCode).toBe(0);
  expect(result.stdout.toString()).toContain('Massar paper entry, phone fields and sent-sheet controls render correctly');
}, 15000);
