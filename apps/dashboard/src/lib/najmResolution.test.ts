import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Guards the one-version rule for the Najm packages.
 *
 * The dashboard is where a second copy actually hurts: `najm-kit` owns React
 * context and Zustand stores, so two resolved copies mean two providers, two
 * sidebar states, and a theme that updates in one tree and not the other —
 * with no error anywhere. `najm-auth` and `najm-core` fail the same way for
 * sessions and the DI registry.
 *
 * A stale nested copy is not hypothetical. Before this test existed, the tree
 * carried `najm-storage/node_modules/najm-kit@2.1.31` and
 * `najm-whatsapp/node_modules/najm-kit@2.1.31` left over from an install that
 * predated the 2.11.2 upgrade. The lockfile was already correct and
 * `bun install` reported "no changes", because Bun does not prune a directory
 * it no longer resolves. Bundlers read the directory, not the lockfile, so the
 * manifest and lock assertions below are not enough on their own — the
 * installed-tree assertion is the one that would have caught it.
 */
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

const WORKSPACE_MANIFESTS = [
  'package.json',
  'apps/dashboard/package.json',
  'packages/server/package.json',
  'packages/seed/package.json',
];

function readJson(relativePath: string): Record<string, any> {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8'));
}

function isNajmPackage(name: string) {
  return name.startsWith('najm-');
}

/** Every Najm version declared by any workspace manifest, keyed by package. */
function declaredVersions() {
  const declared = new Map<string, Map<string, string>>();

  for (const manifest of WORKSPACE_MANIFESTS) {
    const json = readJson(manifest);
    for (const field of ['dependencies', 'devDependencies'] as const) {
      for (const [name, range] of Object.entries(json[field] ?? {})) {
        if (!isNajmPackage(name)) continue;
        const perPackage = declared.get(name) ?? new Map<string, string>();
        perPackage.set(manifest, range as string);
        declared.set(name, perPackage);
      }
    }
  }

  return declared;
}

/** Every Najm entry Bun resolved, keyed by package name, as `name@version`. */
function lockedVersions() {
  const lock = readFileSync(join(repoRoot, 'bun.lock'), 'utf8');
  const entry = /^\s*"([^"]+)":\s*\["(najm-[a-z-]+)@([^"@]+)"/gm;
  const locked = new Map<string, Set<string>>();

  for (const match of lock.matchAll(entry)) {
    const [, key, name, version] = match;
    // Bun keys a nested resolution as "parent/najm-kit"; a hoisted one is the
    // bare package name. Both are recorded so a nested pin is visible here.
    const versions = locked.get(name) ?? new Set<string>();
    versions.add(`${version} (${key})`);
    locked.set(name, versions);
  }

  return locked;
}

/** Every Najm directory that actually exists under node_modules. */
function installedCopies() {
  const root = join(repoRoot, 'node_modules');
  const copies = new Map<string, string[]>();

  const record = (parent: string, prefix: string) => {
    if (!existsSync(parent)) return;
    for (const name of readdirSync(parent)) {
      if (!isNajmPackage(name)) continue;
      const manifest = join(parent, name, 'package.json');
      if (!existsSync(manifest)) continue;
      const version = JSON.parse(readFileSync(manifest, 'utf8')).version as string;
      copies.set(name, [...(copies.get(name) ?? []), `${version} (${prefix}${name})`]);
    }
  };

  record(root, '');
  for (const dependency of readdirSync(root)) {
    if (dependency.startsWith('.')) continue;
    record(join(root, dependency, 'node_modules'), `${dependency}/node_modules/`);
  }

  return copies;
}

describe('Najm dependency resolution', () => {
  test('every workspace pins the same exact Najm versions', () => {
    const drift: string[] = [];

    for (const [name, perManifest] of declaredVersions()) {
      const ranges = new Set(perManifest.values());
      // Exact pins only: a range lets a later install drift one workspace off
      // the version the rest of the monorepo was verified against.
      for (const [manifest, range] of perManifest) {
        if (!/^\d+\.\d+\.\d+$/.test(range)) {
          drift.push(`${name}: ${manifest} declares "${range}", expected an exact version`);
        }
      }
      if (ranges.size > 1) {
        drift.push(`${name}: workspaces disagree — ${[...ranges].join(', ')}`);
      }
    }

    expect(drift).toEqual([]);
  });

  test('the lockfile resolves exactly one version of each Najm package', () => {
    const conflicts: string[] = [];
    const locked = lockedVersions();

    for (const [name, versions] of locked) {
      if (versions.size > 1) {
        conflicts.push(`${name}: ${[...versions].join(', ')}`);
      }
    }

    expect(conflicts).toEqual([]);
    // The two the upgrade plan names explicitly, asserted by name so a future
    // reader sees them fail rather than an empty-array diff.
    expect(locked.get('najm-auth')?.size).toBe(1);
    expect(locked.get('najm-kit')?.size).toBe(1);
  });

  test('the installed tree contains exactly one copy of each Najm package', () => {
    const duplicates: string[] = [];

    for (const [name, paths] of installedCopies()) {
      if (paths.length > 1) {
        duplicates.push(`${name}: ${paths.join(', ')}`);
      }
    }

    // `bun install` does not remove a nested directory it stopped resolving,
    // so this fails on a stale tree even when bun.lock is correct. The fix is
    // to delete the nested copy and re-run `bun install` to confirm it is not
    // recreated — not to relax the assertion.
    expect(duplicates).toEqual([]);
  });

  test('the installed version matches what the manifests pin', () => {
    const mismatches: string[] = [];
    const installed = installedCopies();

    for (const [name, perManifest] of declaredVersions()) {
      const pinned = [...perManifest.values()][0];
      const paths = installed.get(name);
      if (!paths?.length) {
        mismatches.push(`${name}: pinned ${pinned} but not installed`);
        continue;
      }
      const version = paths[0].split(' ')[0];
      if (version !== pinned) {
        mismatches.push(`${name}: pinned ${pinned}, installed ${version}`);
      }
    }

    expect(mismatches).toEqual([]);
  });
});
