import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, basename } from 'node:path';
import { createRequire } from 'node:module';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { buildOfflineShell, shellHash } from 'najm-offline/build';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(appRoot, 'public/offline-shell');
await mkdir(output, { recursive: true });
// School's language menu uses these four rectangular flags. Importing the
// catalog makes Bun inline hundreds of SVGs into every cold-start stylesheet.
const require = createRequire(import.meta.url);
const flagPaths = [];
const flagCssPath = require.resolve('flag-icons/css/flag-icons.css');
const flagCss = postcss.parse(await readFile(flagCssPath, 'utf8'));
flagCss.walkRules(rule => {
  if (!['.fib, .fi', '.fi', '.fi:before', '.fi-us', '.fi-fr', '.fi-es', '.fi-ma'].includes(rule.selector)) rule.remove();
});
for (const declaration of flagCss.nodes.flatMap(rule => rule.nodes ?? [])) {
  const match = declaration.value?.match(/^url\(([^)]+)\)$/);
  if (match) {
    const bytes = await readFile(resolve(flagCssPath, '..', match[1]));
    const name = `flag-${basename(match[1], '.svg')}-${shellHash(bytes)}.svg`;
    const path = `/offline-shell/${name}`;
    await writeFile(resolve(output, name), bytes);
    flagPaths.push(path);
    declaration.value = `url(${path})`;
  }
}

await buildOfflineShell({
  appRoot,
  namespace: 'school',
  entry: resolve(appRoot, 'src/offline/entry.tsx'),
  title: 'MyScolAI',
  // The online auth module hydrates a session; the shell's client never does.
  aliases: { '@/najm.auth': resolve(appRoot, 'src/offline/auth.ts') },
  stylesheet: {
    source: resolve(appRoot, 'src/styles/globals.css'),
    prepend: '@import "najm-theme/styles.css";\n',
    append: flagCss.toString(),
    compile: async (input, from) => (await postcss([tailwind({ base: appRoot, optimize: true })]).process(input, { from })).css,
  },
  fonts: {
    files: ['src/app/fonts/Lora.ttf', 'src/app/fonts/RobotoMono.ttf'],
    css: ([lora, mono]) => `@font-face{font-family:SchoolLora;src:url('${lora}');font-weight:400 700;font-display:swap}@font-face{font-family:SchoolRobotoMono;src:url('${mono}');font-display:swap}:root{--font-lora:SchoolLora;--font-roboto-mono:SchoolRobotoMono}body{font-family:var(--font-lora),system-ui,sans-serif}`,
  },
  files: [...flagPaths, ...['student_male', 'student_female', 'parent_male', 'parent_female'].map(name => `/images/${name}.png`)],
});
