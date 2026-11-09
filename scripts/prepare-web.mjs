import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build as bundle } from 'esbuild';

const root = resolve('.');
const source = resolve(root, 'www');

await bundle({
  entryPoints: [resolve(source, 'js/app.js')],
  outfile: resolve(source, 'js/app.bundle.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  external: ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm']
});

await bundle({
  entryPoints: [resolve(source, 'admin/admin.js')],
  outfile: resolve(source, 'admin/admin.bundle.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  external: ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm']
});

const pdfVendor = resolve(source, 'admin/vendor');
await mkdir(pdfVendor, { recursive: true });
await Promise.all([
  copyFile(resolve(root, 'node_modules/jspdf/dist/jspdf.umd.min.js'), resolve(pdfVendor, 'jspdf.umd.min.js')),
  copyFile(resolve(root, 'node_modules/jspdf/LICENSE'), resolve(pdfVendor, 'jspdf-LICENSE.txt')),
  copyFile(resolve(root, 'node_modules/jspdf-autotable/LICENSE.txt'), resolve(pdfVendor, 'jspdf-autotable-LICENSE.txt'))
]);

console.log('Bundles web e bibliotecas PDF atualizados em www/.');
