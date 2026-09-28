import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { Container, Service } from 'diject';
import type { ResolvedAcademicYear } from '../../src/modules/academicYears/AcademicYearValidator';
import { Year, registerYearPropertyInjector, runWithResolvedYear } from '../../src/modules/academicYears/requestYear';

const older = { id: 'year-2025', label: '2025-2026' } as ResolvedAcademicYear;
const current = { id: 'year-2026', label: '2026-2027' } as ResolvedAcademicYear;

@Service()
class YearPropertyProbe {
  @Year()
  private readonly year!: ResolvedAcademicYear;

  async readAfter(wait: Promise<void>) {
    const first = this.year.label;
    await wait;
    return { first, second: this.year.label };
  }

  normalize(value: string) {
    return { value, year: this.year.label };
  }

  async sharedHelper() {
    return 'shared';
  }
}

function setup() {
  const container = Container.create();
  registerYearPropertyInjector(container);
  container.set(YearPropertyProbe);
  return container;
}

describe('@Year() context getter', () => {
  it('fails visibly without a resolved operation and does not keep the previous year', async () => {
    const container = setup();
    const service = await container.resolve(YearPropertyProbe);
    expect(Object.getOwnPropertyDescriptor(service, 'year')?.get).toBeDefined();
    expect(await container.resolve(YearPropertyProbe)).toBe(service);

    await expect(service.readAfter(Promise.resolve())).rejects.toThrow('Resolved academic year is missing');
    expect(await runWithResolvedYear(container, older, () => service.readAfter(Promise.resolve())))
      .toEqual({ first: older.label, second: older.label });
    await expect(service.readAfter(Promise.resolve())).rejects.toThrow('Resolved academic year is missing');
  });

  it('keeps two concurrent operations isolated on the same singleton after await', async () => {
    const container = setup();
    const service = await container.resolve(YearPropertyProbe);
    let releaseOlder!: () => void;
    const olderWait = new Promise<void>((resolve) => { releaseOlder = resolve; });

    const olderRead = runWithResolvedYear(container, older, () => service.readAfter(olderWait));
    const currentRead = runWithResolvedYear(container, current, () => service.readAfter(Promise.resolve()));
    expect(await currentRead).toEqual({ first: current.label, second: current.label });
    releaseOlder();
    expect(await olderRead).toEqual({ first: older.label, second: older.label });
  });

  it('restores the enclosing scope after a nested operation', async () => {
    const container = setup();
    const service = await container.resolve(YearPropertyProbe);

    const result = await runWithResolvedYear(container, older, async () => {
      const inner = await runWithResolvedYear(container, current, () => service.readAfter(Promise.resolve()));
      const outer = await service.readAfter(Promise.resolve());
      return { inner, outer };
    });
    expect(result.inner.second).toBe(current.label);
    expect(result.outer.second).toBe(older.label);
  });

  it('keeps synchronous service helpers synchronous inside a year scope', async () => {
    const container = setup();
    const service = await container.resolve(YearPropertyProbe);
    expect(runWithResolvedYear(container, older, () => service.normalize('notice')))
      .toEqual({ value: 'notice', year: older.label });
  });

  it('does not wrap methods or require a year for explicitly shared work', async () => {
    const service = await setup().resolve(YearPropertyProbe);
    expect(service.readAfter).toBe(YearPropertyProbe.prototype.readAfter);
    expect(await service.sharedHelper()).toBe('shared');
    expect(() => service.normalize('notice')).toThrow('Resolved academic year is missing');
  });
});
