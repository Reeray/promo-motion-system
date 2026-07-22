#!/usr/bin/env node
/** Print a doc's derived per-scene frames. Diagnostic helper for authoring/tuning. */
import {readFileSync, mkdirSync} from 'fs';
import {join} from 'path';
import {pathToFileURL, fileURLToPath} from 'url';
import esbuild from 'esbuild';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const tmp = join(ROOT, 'node_modules', '.cache', 'promo-parity');
mkdirSync(tmp, {recursive: true});
const out = join(tmp, 'measure.mjs');
await esbuild.build({entryPoints: [join(ROOT, 'src/promo/prepare.ts')], bundle: true, format: 'esm',
  platform: 'node', outfile: out, external: ['react', 'react/jsx-runtime', 'remotion', '@remotion/*'], logLevel: 'silent'});
const {prepare} = await import(pathToFileURL(out).href);
const p = prepare(JSON.parse(readFileSync(process.argv[2], 'utf8')));
for (const s of p.scenes) console.log(`  ${s.scene.id.padEnd(16)} ${String(s.frames).padStart(4)}f  ${(s.frames/60).toFixed(2)}s   start ${s.start}`);
console.log(`  ${'TOTAL'.padEnd(16)} ${String(p.durationInFrames).padStart(4)}f  ${(p.durationInFrames/60).toFixed(2)}s`);
p.warnings.forEach(w => console.log('  ! ' + w));
