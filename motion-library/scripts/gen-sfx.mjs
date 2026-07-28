#!/usr/bin/env node
/**
 * SFX SYNTHESIS  (Stage 2 / Phase B)
 *
 * Writes public/sfx/*.wav from pure arithmetic. No npm audio dependency, no third-party samples —
 * which is the point: this repo is public, and generated audio is ours to redistribute where a
 * downloaded sample is not (the same rule public/README.md applies to captured images).
 *
 * ── THE LAW: SOUND FOLLOWS MOTION ──────────────────────────────────────────────────────────
 * A cue is not "a whoosh that sounds about right for a push". Its LENGTH is the transition's own
 * measured duration, and its AMPLITUDE ENVELOPE is driven by the SAME easing curve the motion
 * uses. `push-off-left` accelerates out of frame on EASE.throwOut, so its sound accelerates on
 * EASE.throwOut. Both numbers are imported from the real source, never retyped here, so a change
 * to the motion is a change to the sound by construction.
 *
 * ── DETERMINISM ────────────────────────────────────────────────────────────────────────────
 * Gate B4 requires regeneration to be byte-identical, so nothing here may vary between runs:
 *   - noise comes from a seeded LCG, never the built-in random()
 *   - sine comes from an odd Taylor polynomial, because the built-in sine is NOT bit-pinned across engines
 *   - only +, -, *, / and floor/round are used, which IEEE-754 does pin
 *
 * ── LEVELS ─────────────────────────────────────────────────────────────────────────────────
 * Every cue peaks at PEAK_CEIL_DBFS, derived by measurement in T26: Remotion sums assets with
 * `amix=normalize=0` (a straight sum), so four coincident cues authored at -6 dBFS measure
 * +0.32 dBTP — over full scale. -15 dBFS is the level at which N=4 still lands at -2.95 dBTP.
 *
 * Files are STEREO (dual-mono). Also from T26: Remotion forces `-ac 2`, and a mono asset loses
 * exactly 3.01 dB in that upmix while the editor's Player (Web Audio) does not — mono would make
 * preview 3 dB louder than render.
 *
 *   npm run sfx
 */
import {execFileSync} from 'child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'fs';
import {join} from 'path';
import {fileURLToPath} from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'public', 'sfx');
const CACHE = join(ROOT, 'node_modules', '.cache', 'sfx');

/* ── the measured motion constants, read from the real source ───────────────────────────────
 * Parsed rather than imported: src/blocks/transitions.tsx transitively pulls src/lib/fonts.ts,
 * which calls loadFont() at module scope and cannot evaluate in Node. gen-blocks.mjs already
 * established this pattern for the same reason. A missing constant THROWS, so a rename breaks the
 * build instead of silently baking in a stale number. */
const tsx = readFileSync(join(ROOT, 'src', 'blocks', 'transitions.tsx'), 'utf8');
const ms = (name) => {
  const m = tsx.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\d+(?:\\.\\d+)?)`));
  if (!m) throw new Error(`gen-sfx: ${name} not found in transitions.tsx — was it renamed? The cue lengths must track the measured motion, so this cannot fall back to a default.`);
  return Number(m[1]);
};
const THROW_MS = ms('THROW_MS');       // 150 — push-off-left
const GLIDE_MS = ms('GLIDE_MS');       // 900 — glide-in
const SCALE_UP_MS = ms('SCALE_UP_MS'); // 100 — scale-up-cut
const POP_MS = ms('POP_MS');           // 430 — scale-pop-in

/* ── the measured easing curves, compiled for Node ──────────────────────────────────────────
 * src/lib/ease.ts imports only Easing from remotion, so unlike transitions.tsx it evaluates
 * headlessly once esbuild has turned the TS into ESM. */
mkdirSync(CACHE, {recursive: true});
const easeBundle = join(CACHE, 'ease.mjs');
execFileSync('npx', ['esbuild', join(ROOT, 'src', 'lib', 'ease.ts'), '--bundle', '--format=esm',
  '--platform=node', `--outfile=${easeBundle}`, '--external:remotion', '--log-level=silent'],
  {cwd: ROOT, shell: process.platform === 'win32'});
const {EASE} = await import(`file://${easeBundle.replace(/\\/g, '/')}`);

/* ── constants ──────────────────────────────────────────────────────────────────────────── */
const SR = 48000;
/** T26. Hardcoded rather than computed with a power function: one such call could differ in the last ULP
 *  across engines, and gate B4 compares bytes. This is that value, to full double precision. */
const PEAK = 0.17782794100389228; // = -15 dBFS
const PI = 3.141592653589793;

/* ── deterministic primitives ───────────────────────────────────────────────────────────── */

/** Odd Taylor sine to x^13. The built-in sine is implementation-defined in its last bits; this is not. */
const sin = (x) => {
  let t = x / (2 * PI);
  t -= Math.floor(t);
  let a = t * (2 * PI);
  if (a > PI) a -= 2 * PI;
  const s = a * a;
  return a * (1 + s * (-1 / 6 + s * (1 / 120 + s * (-1 / 5040 + s * (1 / 362880 + s * (-1 / 39916800 + s * (1 / 6227020800)))))));
};

/** Seeded LCG (Numerical Recipes constants) -> white noise in [-1, 1]. */
const noise = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2147483648 - 1;
  };
};

/** One-pole lowpass. `c` in (0,1]: 1 = open, small = dark. Hand-rolled — no DSP dependency. */
const lp = () => {
  let z = 0;
  return (x, c) => (z += c * (x - z));
};
/** One-pole highpass, as the complement of the same filter. */
const hp = () => {
  const f = lp();
  return (x, c) => x - f(x, c);
};

/* ── envelope helpers ───────────────────────────────────────────────────────────────────── */
/** A short fade at both ends. Every buffer gets one: starting or ending on a non-zero sample is
 *  a step discontinuity, which is audible as a click and is the classic amateur tell. */
const DEFADE = 0.004; // 4 ms
const antiClick = (t01, durS) => {
  const f = Math.min(0.25, DEFADE / durS);
  const a = t01 < f ? t01 / f : 1;
  const b = t01 > 1 - f ? (1 - t01) / f : 1;
  return a * b;
};

/* ── the WAV writer: 16-bit STEREO (dual-mono) ──────────────────────────────────────────── */
const writeWav = (path, samples) => {
  const n = samples.length;
  const data = Buffer.alloc(n * 2 * 2); // 2 channels x 2 bytes
  for (let i = 0; i < n; i++) {
    let v = samples[i];
    v = v > 1 ? 1 : v < -1 ? -1 : v;
    const q = Math.round(v * 32767);
    data.writeInt16LE(q, i * 4);
    data.writeInt16LE(q, i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([h, data]));
  return {bytes: 44 + data.length, samples: n};
};

/** Remove DC before normalising.
 *
 * A swept tone inside a short asymmetric window does not average to zero — measured +1.34e-3 on
 * ui-swap, 0.75% of peak. DC is pure cost: it eats headroom without being audible, and it puts a
 * step at the buffer edges that the anti-click fade then has to hide. The standard one-pole
 * blocker, y[n] = x[n] - x[n-1] + R*y[n-1], with R just under 1 so the corner sits well below the
 * audible band. */
const blockDC = (buf) => {
  const R = 0.9995;
  let xPrev = 0, yPrev = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    const y = x - xPrev + R * yPrev;
    buf[i] = y;
    xPrev = x;
    yPrev = y;
  }
  return buf;
};

/** Normalise to exactly PEAK, so every cue sits at the calibrated ceiling regardless of recipe. */
const toCeiling = (buf) => {
  let m = 0;
  for (const v of buf) { const a = v < 0 ? -v : v; if (a > m) m = a; }
  if (m === 0) return buf;
  const g = PEAK / m;
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
  return buf;
};

const render = (durMs, fn) => {
  const durS = durMs / 1000;
  const n = Math.round(SR * durS);
  const buf = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1 || 1);
    buf[i] = fn(t, i / SR, i) * antiClick(t, durS);
  }
  return toCeiling(blockDC(buf));
};

/* ── the seven cues ─────────────────────────────────────────────────────────────────────── */
const CUES = [
  {
    id: 'push-off-left', ms: THROW_MS, from: 'T.THROW_MS', ease: 'throwOut',
    desc: 'Short throw, cut at peak. Air accelerating away, exactly as the object does.',
    make: () => {
      const nz = noise(0x51F0), f1 = lp(), f2 = hp();
      return render(THROW_MS, (t) => {
        // Amplitude rides the SAME curve as the motion: slow, then a hard rush before the cut.
        const amp = EASE.throwOut(t);
        // The band opens as it accelerates — a whoosh brightens as it leaves.
        const open = 0.05 + 0.55 * amp;
        return f2(f1(nz(), open), 0.06) * amp;
      });
    },
  },
  {
    id: 'glide-in', ms: GLIDE_MS, from: 'T.GLIDE_MS', ease: 'out',
    desc: 'Long decelerating air that settles into stillness, mirroring expo.out.',
    make: () => {
      const nz = noise(0x9C31), f1 = lp();
      return render(GLIDE_MS, (t) => {
        // 1 - out(t): loud on arrival, then the long soft tail expo.out is named for.
        const amp = 1 - EASE.out(t);
        const close = 0.30 * (1 - t) + 0.02; // band darkens as it comes to rest
        return f1(nz(), close) * amp;
      });
    },
  },
  {
    id: 'scale-up-cut', ms: SCALE_UP_MS, from: 'TZ.SCALE_UP_MS', ease: 'preCut',
    desc: 'The Z-axis twin of the throw: a tight upward blip swelling into a hard cut.',
    make: () => {
      const nz = noise(0x2AB7), f1 = lp();
      return render(SCALE_UP_MS, (t, s) => {
        const amp = EASE.preCut(t);          // accelerate into the cut
        const hz = 420 + 680 * amp;          // pitch rises with the swell
        const tone = sin(2 * PI * hz * s);
        return (tone * 0.7 + f1(nz(), 0.25) * 0.3) * amp;
      });
    },
  },
  {
    id: 'scale-pop-in', ms: POP_MS, from: 'TZ.POP_MS', ease: 'camera',
    desc: 'Soft pop with body — a low thump landing under the camera settle.',
    make: () => {
      const nz = noise(0x7D42), f1 = lp();
      return render(POP_MS, (t, s) => {
        // camera() is a strong ease-out settle; the sound decays as the scale comes to rest.
        const settle = 1 - EASE.camera(t);
        const hz = 190 - 70 * EASE.camera(t); // pitch eases down as it lands
        const body = sin(2 * PI * hz * s) * settle;
        const air = f1(nz(), 0.18) * settle * settle * 0.35; // air dies faster than body
        return body * 0.75 + air;
      });
    },
  },
  {
    id: 'ui-tick', ms: 60, from: 'INVENTED', ease: '—',
    desc: 'A control being operated. Dry, short, no pitch — a click, not a beep.',
    make: () => {
      const nz = noise(0x1133), f1 = lp(), f2 = hp();
      return render(60, (t) => {
        const amp = (1 - t) * (1 - t) * (1 - t); // fast cubic decay
        return f2(f1(nz(), 0.5), 0.22) * amp;
      });
    },
  },
  {
    id: 'ui-swap', ms: 180, from: 'INVENTED', ease: '—',
    desc: 'Content exchanging: one thing leaves under another arriving.',
    make: () => {
      const nz = noise(0x64A9), f1 = lp();
      return render(180, (t, s) => {
        const outp = t < 0.5 ? 1 - t * 2 : 0;      // the leaving half
        const inp = t > 0.35 ? (t - 0.35) / 0.65 : 0; // the arriving half, overlapping
        const air = f1(nz(), 0.3) * outp * 0.5;
        const tone = sin(2 * PI * (300 + 180 * inp) * s) * inp * (1 - t) * 0.8;
        return air + tone;
      });
    },
  },
  {
    id: 'ui-rise', ms: 90, from: 'INVENTED', ease: 'out',
    desc: 'One staggered element arriving. Quieter than a tick — many of these may overlap.',
    make: () => {
      const nz = noise(0x3E70), f1 = lp();
      return render(90, (t, s) => {
        const amp = (1 - t) * (1 - t);
        const hz = 300 + 260 * EASE.out(t);
        return (sin(2 * PI * hz * s) * 0.55 + f1(nz(), 0.35) * 0.45) * amp;
      });
    },
  },
];

/* ── write ──────────────────────────────────────────────────────────────────────────────── */
mkdirSync(OUT, {recursive: true});
console.log(`synthesizing ${CUES.length} cues -> public/sfx/  (48kHz stereo 16-bit, peak -15 dBFS)\n`);
console.log(`  ${'id'.padEnd(15)} ${'ms'.padStart(5)} ${'from'.padEnd(16)} ${'ease'.padEnd(9)} bytes`);
const manifest = [];
for (const c of CUES) {
  const buf = c.make();
  const r = writeWav(join(OUT, `${c.id}.wav`), buf);
  manifest.push({id: c.id, ms: c.ms, from: c.from, ease: c.ease, desc: c.desc, ...r});
  console.log(`  ${c.id.padEnd(15)} ${String(c.ms).padStart(5)} ${c.from.padEnd(16)} ${c.ease.padEnd(9)} ${r.bytes}`);
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({
  note: 'Generated by scripts/gen-sfx.mjs. Committed because they are OURS — synthesized, not '
      + 'downloaded. Regeneration must be byte-identical (gate B4). Durations marked INVENTED are '
      + 'not measured from anything; the four transition cues are imported from transitions.tsx.',
  sampleRate: SR, channels: 2, bitDepth: 16, peakDbfs: -15,
  cues: manifest,
}, null, 2) + '\n');
console.log(`\n  three UI durations are marked INVENTED — nothing in the repo measures them.`);
