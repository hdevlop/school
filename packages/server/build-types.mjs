import { execSync } from 'child_process';
import { rmSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = join(__dirname, 'dist');
const isClean = process.argv.includes('--clean');

function removeDtsFiles(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      removeDtsFiles(fullPath);
    } else if (entry.endsWith('.d.ts') || entry.endsWith('.d.ts.map')) {
      rmSync(fullPath);
    }
  }
}

if (isClean) {
  removeDtsFiles(distDir);
  console.log('Cleaned .d.ts files from dist/');
} else {
  execSync(
    // The root config enables incremental compilation. A cached tsbuildinfo can
    // otherwise claim the declaration build is current after `--clean` removes
    // every .d.ts file, leaving the package with runtime JS but no type surface.
    'tsc -p tsconfig.json --declaration --emitDeclarationOnly --noEmit false --incremental false --outDir dist',
    { stdio: 'inherit', cwd: __dirname },
  );
  console.log('Generated .d.ts files in dist/');
}
