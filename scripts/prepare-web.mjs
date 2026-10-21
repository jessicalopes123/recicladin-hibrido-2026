import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build as bundle } from 'esbuild';

const root = resolve('.');
const source = resolve(root, 'www');
const build = resolve(root, 'dist');

await bundle({
  entryPoints: [resolve(source, 'js/app.js')],
  outfile: resolve(source, 'js/app.bundle.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  external: ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm']
});

await rm(build, { recursive: true, force: true });
await mkdir(build, { recursive: true });
await cp(source, build, { recursive: true });

console.log('ReciclaDin Web preparado em www/ e dist/.');
