import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type ShellManifest = { version: string; document: string; assets: string[] };

/**
 * The offline shell this server build was compiled with. `next start` serves
 * only the public files present when it started, so a shell generated later
 * (another build, a test run) must not change what a running server's worker
 * precaches. Unbuilt runs (development, the test fixture) have no build
 * version and read the latest manifest.
 */
export async function readShellManifest(root: string, builtVersion: string | undefined): Promise<ShellManifest> {
  if (builtVersion && !/^[0-9a-f]{20}$/.test(builtVersion)) throw new Error('Invalid offline shell version');
  const file = builtVersion ? `manifest-${builtVersion}.json` : 'manifest.json';
  return JSON.parse(await readFile(resolve(root, 'public/offline-shell', file), 'utf8')) as ShellManifest;
}
