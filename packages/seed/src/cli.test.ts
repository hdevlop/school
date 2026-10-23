import { describe, expect, it } from 'bun:test';

// Exercise the real menu in isolated processes, replacing prompts and deletion.
async function runMenu(command: string, confirmed: boolean, interactive = true) {
  const child = Bun.spawn([process.execPath, '--eval', `
    import { mock } from 'bun:test';
    const events = [];
    Object.defineProperty(process.stdin, 'isTTY', { value: ${interactive} });
    Object.defineProperty(process.stdout, 'isTTY', { value: ${interactive} });
    process.argv = ['bun', 'cli.ts'${interactive ? '' : `, ${JSON.stringify(command)}`}];
    mock.module('@clack/prompts', () => ({
      select: async (options) => {
        events.push({ menu: options.options });
        return options.message === 'Choose a School seed command' ? ${JSON.stringify(command)} : '2026-2027';
      },
      confirm: async (options) => { events.push({ confirmation: options }); return ${confirmed}; },
      cancel: (message) => { console.log(JSON.stringify({ events, cancelled: message })); },
      isCancel: () => false,
      multiselect: async () => ['primaire'],
      text: async () => '',
    }));
    mock.module(${JSON.stringify(new URL('./scripts/demo/reset-demo.ts', import.meta.url).href)}, () => ({
      resetDemo: async (options) => { events.push({ reset: options }); },
    }));
    mock.module(${JSON.stringify(new URL('./scripts/school/seed-academic.ts', import.meta.url).href)}, () => ({
      seedAcademic: async (options) => { events.push({ academic: options, args: process.argv.filter(arg => arg.startsWith('--')) }); },
    }));
    await import(${JSON.stringify(new URL('./cli.ts', import.meta.url).href)});
    console.log(JSON.stringify({ events }));
  `], { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  return { stdout, stderr, code };
}

describe('seed menu', () => {
  it('offers default data with settings and the chosen year and levels', async () => {
    const result = await runMenu('defaults', true);
    expect(result.code).toBe(0);
    const { events } = JSON.parse(result.stdout);
    expect(events[0].menu).toContainEqual(expect.objectContaining({
      value: 'defaults', label: 'Seed default data',
    }));
    expect(events.at(-1)).toEqual({
      academic: { includeSettings: true }, args: ['--year=2026-2027', '--levels=primaire'],
    });
  });

  it('keeps the existing academic-only command free of settings changes', async () => {
    const result = await runMenu('academic', true);
    expect(result.code).toBe(0);
    const { events } = JSON.parse(result.stdout);
    expect(events.at(-1).academic).toEqual({ includeSettings: false });
  });

  it('offers academic deletion directly in the menu and passes the confirmed choice', async () => {
    const result = await runMenu('reset-all', true);
    expect(result.code).toBe(0);
    const { events } = JSON.parse(result.stdout);
    expect(events[0].menu).toContainEqual(expect.objectContaining({
      value: 'reset-all', label: 'Delete school data including academics',
    }));
    expect(events[1].confirmation.initialValue).toBe(false);
    expect(events[1].confirmation.message).toContain('including cycles, classes, sections, subjects and fee types');
    expect(events[2]).toEqual({ reset: { includeAcademic: true } });
  });

  it('keeps academic structure for the existing menu choice', async () => {
    const result = await runMenu('reset-demo', true);
    expect(result.code).toBe(0);
    const { events } = JSON.parse(result.stdout);
    expect(events[1].confirmation.message).toContain('except cycles, classes, sections, subjects and fee types');
    expect(events[2]).toEqual({ reset: { includeAcademic: false } });
  });

  it('cancels academic deletion without invoking the reset', async () => {
    const result = await runMenu('reset-all', false);
    expect(result.code).toBe(0);
    const { events, cancelled } = JSON.parse(result.stdout);
    expect(cancelled).toContain('no data was changed');
    expect(events).toHaveLength(2);
  });

  it('refuses academic deletion without an interactive terminal', async () => {
    const result = await runMenu('reset-all', true, false);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('requires an interactive terminal');
    expect(result.stdout).not.toContain('"reset"');
  });
});
