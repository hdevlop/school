import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const env = {
  ...process.env,
  BROWSERSLIST_IGNORE_OLD_DATA: "true",
};

const nextCliCandidates = [
  "../node_modules/next/dist/bin/next",
  "../../../node_modules/next/dist/bin/next",
];
const preload = fileURLToPath(
  new URL("./suppress-browserslist-warning.cjs", import.meta.url),
);
const appRoot = fileURLToPath(new URL("..", import.meta.url));
const distDir = env.NAJM_NEXT_DIST_DIR?.trim() || ".next";
if (!/^[A-Za-z0-9._-]+$/.test(distDir) || distDir === "." || distDir === "..") {
  throw new Error("NAJM_NEXT_DIST_DIR must be a single directory name inside the dashboard app.");
}
const nextCache = resolve(appRoot, distDir);

const nextCli = nextCliCandidates
  .map((candidate) => fileURLToPath(new URL(candidate, import.meta.url)))
  .find((candidate) => existsSync(candidate));

if (!nextCli) {
  console.error("Unable to find the local Next.js CLI.");
  process.exit(1);
}

if (existsSync(nextCache)) {
  rmSync(nextCache, { recursive: true, force: true });
}

const shellBuild = spawnSync('bun', ['./scripts/build-offline.mjs'], { cwd: appRoot, env, stdio: 'inherit', shell: process.platform === 'win32' });
if (shellBuild.status !== 0) process.exit(shellBuild.status ?? 1);
// Pin the public shell version in this online bundle. Fetching the latest
// manifest later must not relabel an already-open tab as the newer build.
env.NEXT_PUBLIC_SCHOOL_SHELL_VERSION = JSON.parse(readFileSync(resolve(appRoot, 'public/offline-shell/manifest.json'), 'utf8')).version;

const result = spawnSync(process.execPath, ["--require", preload, nextCli, "build", "--webpack"], {
  cwd: appRoot,
  env,
  stdio: "inherit",
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
