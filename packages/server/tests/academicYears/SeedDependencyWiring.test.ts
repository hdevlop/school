import { expect, it } from 'bun:test';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

it('keeps the explicit seed container dependencies aligned with service constructors', () => {
  const seedPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/modules/seed/SeedContainer.ts');
  const seed = ts.createSourceFile(seedPath, readFileSync(seedPath, 'utf8'), ts.ScriptTarget.Latest, true);
  const imports = new Map<string, string>();
  for (const statement of seed.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) ||
        !statement.moduleSpecifier.text.startsWith('.')) continue;
    const names = statement.importClause?.namedBindings;
    if (!names || !ts.isNamedImports(names)) continue;
    for (const item of names.elements) {
      imports.set(item.name.text, resolve(dirname(seedPath), statement.moduleSpecifier.text + '.ts'));
    }
  }

  const mismatches: string[] = [];
  for (const statement of seed.statements) {
    if (!ts.isFunctionDeclaration(statement) || statement.name?.text !== 'configureSeedContainer') continue;
    for (const entry of statement.body?.statements ?? []) {
      if (!ts.isExpressionStatement(entry) || !ts.isCallExpression(entry.expression)) continue;
      const call = entry.expression;
      if (call.expression.getText(seed) !== 'registerSeedDeps') continue;
      const token = call.arguments[1]?.getText(seed);
      const configured = call.arguments[2];
      if (!token || !configured || !ts.isArrayLiteralExpression(configured)) continue;
      const file = imports.get(token);
      if (!file) continue;
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      const declaration = source.statements.find((item) => ts.isClassDeclaration(item) && item.name?.text === token);
      if (!declaration || !ts.isClassDeclaration(declaration)) continue;
      const constructor = declaration.members.find(ts.isConstructorDeclaration);
      const expected = constructor?.parameters.map((param) => param.type?.getText(source) ?? '?') ?? [];
      const actual = configured.elements.map((item) => item.getText(seed));
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        mismatches.push(`${token}: expected [${expected.join(', ')}], got [${actual.join(', ')}]`);
      }
    }
  }
  expect(mismatches).toEqual([]);
});
