import { beforeAll, describe, expect, it } from 'bun:test';

describe('DisciplineController contract', () => {
  let source = '';

  beforeAll(async () => {
    source = await Bun.file(
      new URL('../../src/modules/discipline/DisciplineController.ts', import.meta.url),
    ).text();
  });

  it('exposes only the seven core MCP tools', () => {
    expect(source).toContain("@ToolGroup('discipline')");

    const methods = [...source.matchAll(/async (list|getById|create|update|resolve|reopen|delete)\(/g)]
      .map((match) => match[1]);

    expect(methods).toEqual(['list', 'create', 'resolve', 'reopen', 'getById', 'update', 'delete']);
    expect(source).not.toContain('deleteAll');
  });

  it('applies the matching permission guard to every operation', () => {
    expect(source).toMatch(/@Get\(\)[\s\S]*?@canReadDiscipline\(\)[\s\S]*?async list\(/);
    expect(source).toMatch(/@Post\(\)[\s\S]*?@canCreateDiscipline\(\)[\s\S]*?async create\(/);
    expect(source).toMatch(/@Post\('\/:id\/resolve'\)[\s\S]*?@canResolveDiscipline\(\)[\s\S]*?async resolve\(/);
    expect(source).toMatch(/@Post\('\/:id\/reopen'\)[\s\S]*?@canResolveDiscipline\(\)[\s\S]*?async reopen\(/);
    expect(source).toMatch(/@Get\('\/:id'\)[\s\S]*?@canReadDiscipline\(\)[\s\S]*?async getById\(/);
    expect(source).toMatch(/@Put\('\/:id'\)[\s\S]*?@canUpdateDiscipline\(\)[\s\S]*?async update\(/);
    expect(source).toMatch(/@Delete\('\/:id'\)[\s\S]*?@canDeleteDiscipline\(\)[\s\S]*?async delete\(/);
  });

  it('declares literal workflow routes before the dynamic id route', () => {
    expect(source.indexOf("@Post('/:id/resolve')")).toBeLessThan(source.indexOf("@Get('/:id')"));
    expect(source.indexOf("@Post('/:id/reopen')")).toBeLessThan(source.indexOf("@Get('/:id')"));
  });

  it('marks reads as read-only and mutations with confirmation metadata', () => {
    expect(source.match(/readOnly: true/g)?.length).toBe(2);
    expect(source).toContain("confirm: { level: 'warning', message: 'confirm.discipline.create' }");
    expect(source).toContain("confirm: { level: 'warning', message: 'confirm.discipline.update' }");
    expect(source).toContain("confirm: { level: 'warning', message: 'confirm.discipline.resolve' }");
    expect(source).toContain("confirm: { level: 'danger', message: 'confirm.discipline.reopen' }");
    expect(source).toContain("destructive: true, confirm: { level: 'danger', message: 'confirm.discipline.delete' }");
  });
});
