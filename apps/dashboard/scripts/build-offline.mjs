import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, basename } from 'node:path';
import { createRequire } from 'node:module';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(appRoot, 'public/offline-shell');
await mkdir(output, { recursive: true });
const assetOptions = { publicPath: '/offline-shell/', naming: { asset: '[name]-[hash].[ext]' }, loader: { '.png': 'file', '.svg': 'file', '.jpg': 'file', '.gif': 'file', '.woff2': 'file', '.ttf': 'file' } };
const built = await Bun.build({ entrypoints: [resolve(appRoot, 'src/offline/entry.tsx')], target: 'browser', ...assetOptions,
  plugins: [{ name: 'school-public-navigation', setup(build) {
    const cachedAccount = resolve(appRoot, 'src/offline/cachedAccount.tsx');
    build.onResolve({ filter: /^najm-auth\/client\/react$/ }, args => args.importer === cachedAccount ? undefined : ({ path: cachedAccount }));
    const kit = resolve(appRoot, 'src/offline/kit.tsx');
    build.onResolve({ filter: /^najm-kit$/ }, args => args.importer === kit ? undefined : ({ path: kit }));
    for (const name of ['navigation', 'link', 'image']) build.onResolve({ filter: new RegExp(`^next/${name}$`) }, () => ({ path: resolve(appRoot, `src/offline/${name}.tsx`) }));
    build.onResolve({ filter: /^next(?:\/|$)/ }, args => { throw new Error(`Unsupported offline framework import: ${args.path} from ${args.importer}`); });
    build.onResolve({ filter: /^@\/najm\.auth$/ }, () => ({ path: resolve(appRoot, 'src/offline/auth.ts') }));
  } }],
  minify: true, splitting: false, define: { 'process.env.NODE_ENV': JSON.stringify('production'), 'process.env': '{}', 'process.browser': 'true' },
});
if (!built.success) throw new AggregateError(built.logs, 'Offline shell build failed');
const script = built.outputs.find(asset => asset.kind === 'entry-point' && asset.path.endsWith('.js'));
if (!script) throw new Error('Offline JavaScript entry is missing');
const javascript = await script.text();
const sourceCss = resolve(appRoot, 'src/styles/globals.css');
// Feed the actual Tailwind entry to PostCSS. An indirect import-only entry
// can pass through without expanding @apply/@theme or generating utilities.
// School's language menu uses these four rectangular flags. Importing the
// catalog makes Bun inline hundreds of SVGs into every cold-start stylesheet.
const require = createRequire(import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 20);
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
    const name = `flag-${basename(match[1], '.svg')}-${hash(bytes)}.svg`;
    const path = `/offline-shell/${name}`;
    await writeFile(resolve(output, name), bytes);
    flagPaths.push(path);
    declaration.value = `url(${path})`;
  }
}
const cssInput = '@import "najm-theme/styles.css";\n' + await readFile(sourceCss, 'utf8') + '\n' + flagCss.toString();
const css = (await postcss([tailwind({ base: appRoot, optimize: true })]).process(cssInput, { from: sourceCss })).css;
if (Buffer.byteLength(css) > 500_000) throw new Error('Offline main stylesheet exceeds the 500 KB budget');
if (/@(?:tailwind|apply|theme)\b/.test(css) || !css.includes('.flex{')) throw new Error('Offline Tailwind styles were not compiled');
// Resolve imported CSS images/fonts too; preserve every emitted asset.
const styled = await Bun.build({ entrypoints: [sourceCss], target: 'browser', ...assetOptions,
  plugins: [{ name: 'school-compiled-css', setup(build) {
    // These immutable public files are already written and enter the manifest
    // below. Keeping them external prevents Bun from inlining SVGs again.
    build.onResolve({ filter: /^\/offline-shell\/flag-/ }, args => ({ path: args.path, external: true }));
    build.onLoad({ filter: /[/\\]styles[/\\]globals\.css$/ }, () => ({ contents: css, loader: 'css' }));
  } }], minify: true,
});
if (!styled.success) throw new AggregateError(styled.logs, 'Offline CSS build failed');
const scriptPath = `/offline-shell/app-${hash(javascript)}.js`;
const fonts = ['Lora', 'RobotoMono'];
const fontPaths = [];
for (const name of fonts) {
  const bytes = await readFile(resolve(appRoot, `src/app/fonts/${name}.ttf`));
  const path = `/offline-shell/${name}-${hash(bytes)}.ttf`;
  await writeFile(resolve(appRoot, 'public' + path), bytes);
  fontPaths.push(path);
}
const fontCss = `@font-face{font-family:SchoolLora;src:url('${fontPaths[0]}');font-weight:400 700;font-display:swap}@font-face{font-family:SchoolRobotoMono;src:url('${fontPaths[1]}');font-display:swap}:root{--font-lora:SchoolLora;--font-roboto-mono:SchoolRobotoMono}body{font-family:var(--font-lora),system-ui,sans-serif}`;
const extraAssets = [];
const stylePaths = [];
for (const asset of [...built.outputs, ...styled.outputs]) {
  if (asset === script) continue;
  const bytes = new Uint8Array(await asset.arrayBuffer());
  const isStyle = asset.path.endsWith('.css');
  const name = isStyle ? `style-${hash(bytes)}.css` : basename(asset.path);
  const path = `/offline-shell/${name}`;
  await writeFile(resolve(output, name), bytes);
  extraAssets.push(path);
  if (isStyle) stylePaths.push(path);
}
const finalStylePath = `/offline-shell/fonts-${hash(fontCss)}.css`;
await writeFile(resolve(appRoot, 'public' + scriptPath), javascript);
await writeFile(resolve(appRoot, 'public' + finalStylePath), fontCss);
const fallbackImages = ['student_male', 'student_female', 'parent_male', 'parent_female'].map(name => `/images/${name}.png`);
for (const path of fallbackImages) await readFile(resolve(appRoot, 'public' + path));
const assets = [...new Set([scriptPath, ...extraAssets, finalStylePath, ...fontPaths, ...flagPaths, ...fallbackImages])];
// Include HTML policy/structure in build identity as well as every asset byte.
const policy = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'self'; object-src 'none'";
const head = `<meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MyScolAI</title>${[...stylePaths, finalStylePath].map(path => `<link rel="stylesheet" href="${path}">`).join('')}<script type="module" src="${scriptPath}"></script>`;
const version = hash(head + JSON.stringify(assets));
const html = `<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="school-shell-version" content="${version}">${head}</head><body><div id="root"></div></body></html>`;
const document = `/offline-shell/shell-${hash(html)}.html`;
await writeFile(resolve(appRoot, 'public' + document), html);
const manifest = { version, document, assets };
// Catch an emitted stylesheet referring to an asset that was never packaged.
for (const path of stylePaths) {
  const contents = await readFile(resolve(appRoot, 'public' + path), 'utf8');
  for (const [, value] of contents.matchAll(/url\(["']?([^\s"')]+)["']?\)/g)) {
    if (value.startsWith('data:') || value.startsWith('#')) continue;
    if (!assets.includes(value)) throw new Error(`Unpackaged CSS asset in ${path}: ${value}`);
  }
}
// A built server's worker reads its own version's manifest (see
// src/app/sw.js/shellManifest.ts); manifest.json names the latest shell.
await writeFile(resolve(output, `manifest-${manifest.version}.json`), JSON.stringify(manifest));
await writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest));
console.log(`Offline shell ${manifest.version}: ${script.size} bytes JS, ${assets.length} complete assets (${stylePaths.length} stylesheets)`);
