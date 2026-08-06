import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
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
const nextCache = fileURLToPath(new URL("../.next", import.meta.url));

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

const result = spawnSync(process.execPath, ["--require", preload, nextCli, "build", "--webpack"], {
  cwd: appRoot,
  env,
  stdio: "inherit",
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
