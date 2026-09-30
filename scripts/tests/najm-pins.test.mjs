import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * "One version of each Najm package": every workspace declares the exact
 * version the root pins, and the root overrides each package to that pin. The
 * overrides decide what is installed, so a stale workspace pin changes nothing
 * at install time and nothing else notices it.
 */

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const manifest = read("package.json");
const isNajm = (name) => name === "diject" || name.startsWith("najm-");

// diject reaches School through Najm, so the root pins it only as an override.
const pins = Object.fromEntries([
  ...Object.entries(manifest.dependencies ?? {}).filter(([name]) => isNajm(name)),
  ["diject", manifest.overrides?.diject],
]);

function workspaceManifests() {
  return manifest.workspaces.flatMap((pattern) => {
    if (!pattern.endsWith("/*")) throw new Error(`Unsupported workspace pattern: ${pattern}`);
    const parent = pattern.slice(0, -2);
    return readdirSync(join(root, parent), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(root, parent, entry.name, "package.json")))
      .map((entry) => `${parent}/${entry.name}/package.json`);
  });
}

describe("Najm pins", () => {
  it("are exact versions, each overridden to itself", () => {
    expect(Object.keys(pins).length).toBeGreaterThan(1);
    for (const [name, version] of Object.entries(pins)) {
      expect(version, name).toMatch(/^\d+\.\d+\.\d+$/);
      expect([`$${name}`, version], name).toContain(manifest.overrides?.[name]);
    }
  });

  it("are the same in every workspace", () => {
    const paths = workspaceManifests();
    expect(paths.length).toBeGreaterThan(0);
    const stale = [];
    for (const path of paths) {
      const workspace = read(path);
      for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
        for (const [name, version] of Object.entries(workspace[section] ?? {})) {
          if (isNajm(name) && version !== pins[name]) stale.push(`${path} ${section} ${name} ${version}`);
        }
      }
    }
    expect(stale).toEqual([]);
  });
});
