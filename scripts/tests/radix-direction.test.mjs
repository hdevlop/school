import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * najm-kit gives Radix the page's direction through `DirectionProvider`, and a
 * Radix menu, select or tab list reads it through the same React context. Each
 * Radix component pins its own `@radix-ui/react-direction`; when two versions
 * are installed, the provider and the popups hold different context objects,
 * every popup falls back to `dir="ltr"`, and an Arabic page gets left-to-right
 * menus. The root override keeps one copy; this test fails if a second returns.
 */

const root = fileURLToPath(new URL("../../", import.meta.url));
const PACKAGE = join("@radix-ui", "react-direction");

function installedCopies(dir, depth = 0) {
  const copies = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return copies;
  }
  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const path = join(dir, name);
    if (name.startsWith("@")) {
      copies.push(...installedCopies(path, depth));
      continue;
    }
    if (!statSync(path).isDirectory()) continue;
    if (path.endsWith(PACKAGE)) {
      const { version } = JSON.parse(readFileSync(join(path, "package.json"), "utf8"));
      copies.push({ path: path.slice(root.length), version });
    }
    if (depth < 3) copies.push(...installedCopies(join(path, "node_modules"), depth + 1));
  }
  return copies;
}

describe("Radix direction", () => {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const pinned = manifest.overrides?.["@radix-ui/react-direction"];

  it("is overridden to one exact version", () => {
    expect(pinned).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("is installed once, at that version", () => {
    const copies = installedCopies(join(root, "node_modules"));
    expect(copies.map((copy) => copy.version)).toEqual([pinned]);
  });
});
