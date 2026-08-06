import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/najm.ts',
    'src/modules/index.ts',
    'src/locales/index.ts',
  ],
  format: ['esm'],
  target: 'es2022',
  dts: {
    compilerOptions: {
      incremental: false,
      composite: false,
    },
  },
  splitting: false,
  sourcemap: false,
  clean: true,
  outDir: 'dist',
  outExtension: () => ({ js: '.js' }),
  bundle: true,
  skipNodeModulesBundle: true,
  external: [
    'najm-api', 'najm-auth', 'najm-cache', 'najm-cookies', 'najm-core',
    'najm-cors', 'najm-database', 'najm-email', 'najm-event', 'najm-guard',
    'najm-i18n', 'najm-mcp', 'najm-rate', 'najm-storage', 'najm-validation',
    'hono', 'reflect-metadata', 'diject',
    'drizzle-orm', 'drizzle-zod', 'postgres', 'nanoid', 'zod',
    'pino', 'pino-pretty', 'nodemailer', 'lodash.isempty',
  ],
  esbuildOptions(options) {
    options.keepNames = true;
  },
  esbuildPlugins: [
    {
      name: 'preserve-metadata',
      setup(build) {
        build.onLoad({ filter: /\.ts$/ }, async (args) => {
          const ts = await import('typescript');
          const fs = await import('fs');

          const source = await fs.promises.readFile(args.path, 'utf8');

          const result = ts.transpileModule(source, {
            compilerOptions: {
              target: ts.ScriptTarget.ES2022,
              module: ts.ModuleKind.ESNext,
              experimentalDecorators: true,
              emitDecoratorMetadata: true,
              moduleResolution: ts.ModuleResolutionKind.Bundler,
            },
          });

          return {
            contents: result.outputText,
            loader: 'js',
          };
        });
      },
    },
  ],
});