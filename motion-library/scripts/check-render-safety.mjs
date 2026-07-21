#!/usr/bin/env node
/**
 * PRE-RENDER STATIC GATE — "declare, don't inherit".
 *
 * The gallery renders compositions inside a normal page, so they inherit font, colour and
 * background from the site CSS. A headless render has NO page CSS. Anything a component
 * inherits instead of declaring silently changes between the two — it looks correct in the
 * gallery and is wrong in the MP4.
 *
 * This has bitten three times:
 *   1. background  -> `var(--bg, #ffffff)` fell back to pure white  (blinding render)
 *   2. colour      -> theme-aware `P.fg` on a fixed dark stage      (invisible text)
 *   3. font        -> no fontFamily at all                          (serif render)
 *
 * Rules enforced here:
 *   R1  Any AbsoluteFill that declares a background is a STAGE, and must also declare a
 *       fontFamily. (Inner transform-only layers declare no background and correctly inherit.)
 *   R2  Files that render on a FIXED palette (promos/, clips/) must not import the
 *       theme-aware palette `P` — they must use `PX` (light) or `PD` (dark).
 *   R3  No pure-white stage background (#fff/#ffffff) — see the RENDER EXPOSURE law.
 *
 * Usage: node scripts/check-render-safety.mjs
 */
import {readFileSync, readdirSync, statSync} from 'fs';
import {join, relative} from 'path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(ROOT, 'src');
const failures = [];

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.tsx') ? [p] : [];
  });

// Style constants declared in the file, e.g. `const WHITE: React.CSSProperties = {...}`
const styleConsts = (src) => {
  const map = {};
  const re = /const\s+(\w+)\s*:\s*React\.CSSProperties\s*=\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(src))) map[m[1]] = m[2];
  return map;
};

// Pull the balanced style={{ ... }} object that follows an <AbsoluteFill
const styleObjectAt = (src, from) => {
  const i = src.indexOf('style={{', from);
  if (i === -1 || i > from + 120) return null;
  let depth = 0;
  for (let j = i + 7; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') {
      depth--;
      if (depth === 0) return src.slice(i + 8, j);
    }
  }
  return null;
};

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const src = readFileSync(file, 'utf8');
  const consts = styleConsts(src);
  const inRenderPath = /\/(promos|clips)\//.test('/' + rel);

  // R4 — no hardcoded font-family string in the render path. Fonts must come from the
  // loader (src/lib/fonts.ts / FONT.*), or the render names a font it never loaded — which
  // is exactly how every render was silently serif / Segoe UI until the loader existed.
  if (inRenderPath || rel.includes('blocks/')) {
    for (const m of src.matchAll(/fontFamily\s*:\s*(['"`])([^'"`]*)\1/g)) {
      const val = m[2];
      if (/\b(Inter|Geist|IBM Plex|Consolas|Arial|Helvetica)\b/.test(val)) {
        const line = src.slice(0, m.index).split('\n').length;
        failures.push(`${rel}:${line}: hardcoded font "${val}" — use FONT.sans/FONT.mono ` +
          `(loaded via @remotion/google-fonts). A literal family name may not be loaded in a render.`);
      }
    }
  }

  // R2 — fixed-palette areas must not use the theme-aware palette
  if (inRenderPath) {
    const imp = src.match(/import\s*\{([^}]*)\}\s*from\s*'[^']*lib\/palette'/);
    if (imp && /\bP\b/.test(imp[1])) {
      failures.push(`${rel}: imports theme-aware \`P\` — promos/clips must use PX (light) or PD (dark). ` +
        `Theme vars resolve to their fallback in a render, which is how text went invisible on a dark stage.`);
    }
  }

  // R1 + R3 — every stage (an AbsoluteFill with a background) declares a font, and isn't pure white
  let idx = 0;
  while ((idx = src.indexOf('<AbsoluteFill', idx)) !== -1) {
    const style = styleObjectAt(src, idx);
    idx += 13;
    if (!style) continue;

    // expand spread constants so `{...WHITE}` counts as declaring what WHITE declares
    let expanded = style;
    for (const [name, body] of Object.entries(consts)) {
      if (style.includes(`...${name}`)) expanded += ';' + body;
    }

    const hasBg = /background(Color)?\s*:/.test(expanded);
    const hasFont = /fontFamily\s*:/.test(expanded);
    const line = src.slice(0, idx).split('\n').length;

    if (hasBg && !hasFont) {
      failures.push(`${rel}:${line}: stage declares a background but no fontFamily — ` +
        `a headless render has no page CSS and will fall back to serif.`);
    }
    if (/background(Color)?\s*:\s*['"`]#(fff|ffffff)\b/i.test(expanded)) {
      failures.push(`${rel}:${line}: pure-white stage background — see the RENDER EXPOSURE law ` +
        `(a full-frame #fff renders at ~252/255 mean luminance).`);
    }
  }
}

if (failures.length) {
  console.error(`\n✗ render-safety: ${failures.length} problem(s) — these look FINE in the gallery and wrong in the render:\n`);
  for (const f of failures) console.error('  • ' + f);
  console.error('\nRule: declare, do not inherit. Stages own their font, background and colour.\n');
  process.exit(1);
}
console.log('✓ render-safety: every stage declares its own font/background; no theme-var leakage into renders.');
