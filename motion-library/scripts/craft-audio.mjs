#!/usr/bin/env node
/* ============================================================================
 * CRAFT-AUDIO — the house sound kit, synthesized deterministically.
 *
 *   node scripts/craft-audio.mjs            generate into public/sfx + public/music
 *   node scripts/craft-audio.mjs --verify   generate, then measure every claim below
 *   node scripts/craft-audio.mjs --prove    generate twice into temp, compare bytes
 *
 * WHY SYNTHESIS AND NOT SAMPLES. Three reasons, all structural:
 *   1. Licensing: these files are OURS, provable from this script. Library audio
 *      (Pixabay/Mixkit/Epidemic…) forbids standalone redistribution, so it can never
 *      be committed — see audio/RESEARCH.md. This script is code, and commits fine.
 *   2. Fit: every one-shot is cut to its cue kind's EXACT slot length (CUE_MS in
 *      src/promo/sound.ts) and mastered to the T26 peak ceiling (−15 dBFS), so a kit
 *      sound can never clip the amix sum that library files routinely blow through.
 *   3. Determinism: seeded PRNG, no clock — byte-identical on every run (--prove),
 *      which keeps "did the audio change" answerable by hash instead of by ear.
 *
 * THE ONE LAW THIS DOES NOT BREAK: nothing here AUTO-FILLS a cue. The kit lands in
 * git-ignored public/sfx|music as an OFFER — the editor lists it, the user assigns it.
 *
 * The percussion trio (dum/tek/ghost) implements the HF Logo Intro handoff spec
 * verbatim ("D:/Memofree/HF Logo Intro animation/handoff/hf-intro-spec.json"
 * §assets.audio): creamy-keycap thocks, three accent tiers. `dum-deep` pre-renders
 * the spec's playbackRate 0.82 logo hit, because our cue layer has no rate param.
 *
 * Music beds are composed ON THE FRAME GRID: at 60fps a beat is 3600/BPM frames, so
 * only BPMs where that divides evenly (90→40f, 100→36f, 120→30f, 144→25f, 150→24f,
 * 180→20f) can put every beat exactly on a frame. All three beds use such BPMs —
 * that is what makes "on-beat" a property of arithmetic here, not of nudging.
 * Beds master to −1.5 dBFS sample peak (commercial-loudness convention) because the
 * MUSIC_LEVEL tokens (0.18/0.3) were calibrated against normally-mastered music;
 * one-shots master to −15 dBFS because they enter the mix at full gain.
 * ========================================================================== */

import {mkdirSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SR = 48000;
const PEAK_ONESHOT = Math.pow(10, -15 / 20); // −15 dBFS — the T26 ceiling
const PEAK_BED = Math.pow(10, -1.5 / 20); // −1.5 dBFS — mastered-music convention

/* ── deterministic rng ────────────────────────────────────────────────────── */
const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* ── primitives ───────────────────────────────────────────────────────────── */
const secs = (ms) => Math.round((ms / 1000) * SR);
const buf = (ms) => new Float64Array(secs(ms));

/** Phase-accumulated sine with exponential frequency glide f0→f1 over the buffer. */
const sweep = (out, f0, f1, gain = 1) => {
  let ph = 0;
  const n = out.length;
  for (let i = 0; i < n; i++) {
    const f = f0 * Math.pow(f1 / f0, i / n);
    ph += (2 * Math.PI * f) / SR;
    out[i] += Math.sin(ph) * gain;
  }
  return out;
};

const noise = (out, rnd, gain = 1) => {
  for (let i = 0; i < out.length; i++) out[i] += (rnd() * 2 - 1) * gain;
  return out;
};

/** One-pole lowpass in place (alpha in 0..1, higher = brighter) — the HF spec's filter. */
const onepole = (out, alpha) => {
  let y = 0;
  for (let i = 0; i < out.length; i++) {
    y += alpha * (out[i] - y);
    out[i] = y;
  }
  return out;
};

/** One-pole highpass (subtract the lowpass). */
const hipass = (out, alpha) => {
  let y = 0;
  for (let i = 0; i < out.length; i++) {
    y += alpha * (out[i] - y);
    out[i] = out[i] - y;
  }
  return out;
};

/** RBJ biquad bandpass, constant skirt. */
const bandpass = (out, f, q) => {
  const w = (2 * Math.PI * f) / SR;
  const a = Math.sin(w) / (2 * q);
  const b0 = a, b1 = 0, b2 = -a;
  const a0 = 1 + a, a1 = -2 * Math.cos(w), a2 = 1 - a;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < out.length; i++) {
    const x = out[i];
    const y = (b0 / a0) * x + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
};

/** Exponential amplitude decay (rate per second) — the HF spec's envelope shape. */
const decay = (out, rate, from = 0) => {
  for (let i = from; i < out.length; i++) out[i] *= Math.exp((-rate * (i - from)) / SR);
  return out;
};

/** Linear attack over ms. */
const attack = (out, ms) => {
  const n = Math.min(out.length, secs(ms));
  for (let i = 0; i < n; i++) out[i] *= i / n;
  return out;
};

/** Raised-cosine fade-out over ms at the tail — every one-shot ends at silence. */
const fadeOut = (out, ms) => {
  const n = Math.min(out.length, secs(ms));
  for (let i = 0; i < n; i++) {
    const t = i / n;
    out[out.length - 1 - i] *= 0.5 - 0.5 * Math.cos(Math.PI * t);
  }
  return out;
};

/** DC blocker — the ui-swap lesson (a measured +1.34e-3 offset once shipped). */
const dcBlock = (out) => {
  let x1 = 0, y1 = 0;
  const R = 0.9995;
  for (let i = 0; i < out.length; i++) {
    const y = out[i] - x1 + R * y1;
    x1 = out[i];
    y1 = y;
    out[i] = y;
  }
  return out;
};

const mix = (a, b, at = 0) => {
  const off = secs(at);
  for (let i = 0; i < b.length && off + i < a.length; i++) a[off + i] += b[i];
  return a;
};

const scale = (out, g) => {
  for (let i = 0; i < out.length; i++) out[i] *= g;
  return out;
};

/** Exact mean removal. The dcBlock filter is a ~4Hz highpass — on a 50ms file the finite-sample
 *  mean of plain noise (~σ/√N) sits above our 1e-4 gate without being true DC; subtracting the
 *  measured mean is what makes the gate honest for short quiet one-shots. */
const demean = (ch) => {
  for (const c of ch) {
    let s = 0;
    for (let i = 0; i < c.length; i++) s += c[i];
    const m = s / c.length;
    for (let i = 0; i < c.length; i++) c[i] -= m;
  }
  return ch;
};

/** Normalize to a sample-peak ceiling, then DC-block and demean. */
const master = (ch, ceil) => {
  for (const c of ch) dcBlock(c);
  demean(ch);
  let peak = 0;
  for (const c of ch) for (let i = 0; i < c.length; i++) peak = Math.max(peak, Math.abs(c[i]));
  const g = peak > 0 ? ceil / peak : 1;
  for (const c of ch) scale(c, g);
  return ch;
};

/** Gentle tanh glue for the beds — tames stacked-voice peaks before the final normalize. */
const saturate = (out, drive = 1.4) => {
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * drive) / Math.tanh(drive);
  return out;
};

/** Pan a mono buffer into L/R (p: −1..1, equal-power). */
const panTo = (mono, p) => {
  const l = new Float64Array(mono.length);
  const r = new Float64Array(mono.length);
  const gl = Math.cos(((p + 1) / 4) * Math.PI);
  const gr = Math.sin(((p + 1) / 4) * Math.PI);
  for (let i = 0; i < mono.length; i++) {
    l[i] = mono[i] * gl;
    r[i] = mono[i] * gr;
  }
  return [l, r];
};

/** Moving pan: mono → stereo with pan gliding p0→p1 (the whoosh's travel). */
const panSweep = (mono, p0, p1) => {
  const l = new Float64Array(mono.length);
  const r = new Float64Array(mono.length);
  for (let i = 0; i < mono.length; i++) {
    const p = p0 + ((p1 - p0) * i) / mono.length;
    l[i] = mono[i] * Math.cos(((p + 1) / 4) * Math.PI);
    r[i] = mono[i] * Math.sin(((p + 1) / 4) * Math.PI);
  }
  return [l, r];
};

/** 16-bit stereo WAV. */
const wav = (ch) => {
  const n = ch[0].length;
  const data = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(ch[0][i] * 32767))), i * 4);
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(ch[1][i] * 32767))), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
};

/* ============================================================================
 * THE ONE-SHOTS — one per cue kind, cut to CUE_MS, plus the HF percussion.
 * Each returns [L, R] float channels BEFORE mastering.
 * ========================================================================== */
const SFX = {
  /* ui-tick 60ms — the keycap: tiny pitch-dropped knock + lowpassed click. */
  'kit-tick': () => {
    const rnd = mulberry32(101);
    const m = buf(60);
    mix(m, decay(sweep(buf(60), 1500, 650, 0.9), 60));
    mix(m, decay(onepole(noise(buf(18), rnd, 0.8), 0.18), 300));
    return panTo(fadeOut(m, 12), 0);
  },
  /* ui-tick alt — softer, higher: for dense tick runs where the full thock crowds. */
  'kit-tick-soft': () => {
    const rnd = mulberry32(102);
    const m = buf(60);
    mix(m, decay(sweep(buf(60), 2100, 1100, 0.5), 90));
    mix(m, decay(onepole(noise(buf(12), rnd, 0.5), 0.24), 380));
    return panTo(fadeOut(m, 12), 0);
  },

  /* ui-rise 90ms — a small lift: chirp up with an airy top. */
  'kit-rise': () => {
    const rnd = mulberry32(103);
    const m = buf(90);
    mix(m, attack(sweep(buf(90), 480, 940, 0.7), 8));
    mix(m, attack(decay(bandpass(noise(buf(90), rnd, 0.5), 2400, 1.2), 18), 20));
    return panTo(fadeOut(m, 30), 0);
  },

  /* ui-swap 180ms — out-click then in-thock: two events, one gesture. */
  'kit-swap': () => {
    const rnd = mulberry32(104);
    const m = buf(180);
    mix(m, decay(onepole(noise(buf(14), rnd, 0.7), 0.22), 320));
    mix(m, decay(sweep(buf(90), 1200, 520, 0.85), 55), 90);
    mix(m, decay(onepole(noise(buf(16), rnd, 0.5), 0.16), 300), 90);
    return panTo(fadeOut(m, 24), 0);
  },

  /* scale-up-cut 100ms (outro, Z axis) — a tight zip up-and-gone. */
  'kit-zip': () => {
    const rnd = mulberry32(105);
    const m = attack(decay(bandpass(noise(buf(100), rnd, 1), 1400, 0.9), 26), 10);
    // brighten across the throw: the object leaves TOWARD the lens
    const b = attack(decay(bandpass(noise(buf(100), rnd, 0.6), 3200, 1.4), 30), 26);
    mix(m, b, 18);
    return panTo(fadeOut(m, 22), 0);
  },

  /* push-off-left 150ms (outro, X axis) — a whoosh that TRAVELS left, like the motion. */
  'kit-whoosh-out': () => {
    const rnd = mulberry32(106);
    const m = attack(decay(bandpass(noise(buf(150), rnd, 1), 700, 0.8), 16), 22);
    mix(m, attack(decay(bandpass(noise(buf(150), rnd, 0.5), 1800, 1.1), 20), 30));
    return panSweep(fadeOut(m, 30), 0.25, -0.85);
  },

  /* glide-in 900ms (intro, X axis) — the long arrival: swell that lands at the glide's
   * settle (~60%), then a soft presence tail. Travels right→center. */
  'kit-glide': () => {
    const rnd = mulberry32(107);
    const m = buf(900);
    const swell = attack(bandpass(noise(buf(560), rnd, 0.9), 900, 0.7), 320);
    for (let i = 0; i < swell.length; i++) swell[i] *= 0.35 + (0.65 * i) / swell.length;
    mix(m, swell);
    mix(m, decay(sweep(buf(240), 190, 95, 0.8), 22), 540); // the landing weight
    mix(m, decay(onepole(noise(buf(200), rnd, 0.35), 0.14), 30), 540); // its knock
    mix(m, decay(bandpass(noise(buf(340), rnd, 0.25), 2600, 1.6), 11), 560); // shimmer tail
    return panSweep(fadeOut(m, 140), 0.7, 0);
  },

  /* scale-pop-in 430ms (intro, Z axis) — the logo-lands pop: thump + click + shimmer. */
  'kit-pop': () => {
    const rnd = mulberry32(108);
    const m = buf(430);
    mix(m, decay(sweep(buf(300), 150, 62, 1), 20));
    mix(m, decay(onepole(noise(buf(20), rnd, 0.9), 0.2), 280));
    mix(m, decay(bandpass(noise(buf(320), rnd, 0.3), 2900, 1.5), 12), 40);
    return panTo(fadeOut(m, 90), 0);
  },

  /* custom 1000ms — a neutral accent for user-placed cues: soft boom, long shimmer. */
  'kit-accent': () => {
    const rnd = mulberry32(109);
    const m = buf(1000);
    mix(m, decay(sweep(buf(600), 130, 55, 1), 12));
    mix(m, decay(onepole(noise(buf(24), rnd, 0.6), 0.15), 240));
    mix(m, decay(bandpass(noise(buf(800), rnd, 0.3), 2200, 1.2), 6), 60);
    return panTo(fadeOut(m, 220), 0);
  },

  /* Percussion one-shots for cue slots: the clap and snap, offered like every kit sound. */
  'kit-clap': () => {
    const rnd = mulberry32(120);
    return panTo(fadeOut(clap(rnd, 1), 40), 0);
  },
  'kit-snap': () => {
    const rnd = mulberry32(121);
    return panTo(fadeOut(snap(rnd, 1), 20), 0);
  },

  /* Risers — tension into a downbeat. End EXACTLY at their length: the last 40ms are
   * shaped to silence so the downbeat lands in a written gap (the driving-version trick). */
  'kit-riser-500': () => {
    const rnd = mulberry32(110);
    const m = buf(500);
    const n = attack(noise(buf(500), rnd, 1), 420);
    bandpass(n, 1200, 0.8);
    for (let i = 0; i < n.length; i++) n[i] *= 0.25 + (0.75 * i) / n.length;
    mix(m, n);
    mix(m, attack(sweep(buf(500), 220, 880, 0.4), 460));
    return panTo(fadeOut(m, 40), 0);
  },
  'kit-riser-1000': () => {
    const rnd = mulberry32(111);
    const m = buf(1000);
    const n = attack(noise(buf(1000), rnd, 1), 900);
    bandpass(n, 900, 0.7);
    for (let i = 0; i < n.length; i++) n[i] *= 0.2 + (0.8 * i) / n.length;
    mix(m, n);
    mix(m, attack(sweep(buf(1000), 160, 1050, 0.45), 940));
    return panTo(fadeOut(m, 50), 0);
  },

  /* ── the HF handoff percussion, spec-exact ──────────────────────────────── */
  /* dum 160ms: sine 150→70Hz (decay 30/s) + one-pole(0.12) noise click (decay 260/s),
   * whole thing decays 24/s. The accent voice for weight ≥ 0.9. */
  'kit-drum-dum': () => {
    const rnd = mulberry32(112);
    const m = buf(160);
    mix(m, decay(sweep(buf(160), 150, 70, 1), 30));
    mix(m, decay(onepole(noise(buf(160), rnd, 0.9), 0.12), 260));
    decay(m, 24);
    return panTo(fadeOut(m, 20), 0);
  },
  /* tek 90ms: sine 330→180Hz, brighter click (alpha 0.28). The mid tap, 0.5–0.9. */
  'kit-drum-tek': () => {
    const rnd = mulberry32(113);
    const m = buf(90);
    mix(m, decay(sweep(buf(90), 330, 180, 1), 30));
    mix(m, decay(onepole(noise(buf(90), rnd, 0.9), 0.28), 260));
    decay(m, 24);
    return panTo(fadeOut(m, 14), 0);
  },
  /* ghost 50ms: faint lowpassed tick at gain 0.32 — kept UNDER the ceiling on purpose:
   * a normalized ghost would not be a ghost. Weight < 0.5. */
  'kit-drum-ghost': () => {
    const rnd = mulberry32(114);
    const m = decay(onepole(noise(buf(50), rnd, 1), 0.1), 200);
    scale(m, 0.32);
    return {ch: panTo(fadeOut(m, 10), 0), noNormalize: true};
  },
  /* dum-deep 195ms: the spec's logo hit is dum at playbackRate 0.82 — pre-rendered here
   * (160/0.82 ≈ 195ms, every frequency and rate scaled by 0.82) since cues have no rate. */
  'kit-drum-dum-deep': () => {
    const rnd = mulberry32(115);
    const m = buf(195);
    mix(m, decay(sweep(buf(195), 150 * 0.82, 70 * 0.82, 1), 30 * 0.82));
    mix(m, decay(onepole(noise(buf(195), rnd, 0.9), 0.12 * 0.82), 260 * 0.82));
    decay(m, 24 * 0.82);
    return panTo(fadeOut(m, 24), 0);
  },
};

/* ============================================================================
 * THE BEDS — three loops on the 60fps frame grid, ~32s each.
 * A tiny event sequencer: notes at (bar, beat16) → voice renderers.
 * ========================================================================== */
const NOTE = (() => {
  const names = {A: 0, B: 2, C: 3, D: 5, E: 7, F: 8, G: 10}; // A minor, A2 = 110Hz base
  return (n, oct) => 110 * Math.pow(2, oct - 2 + names[n] / 12);
})();

/** A soft kick: pitch-dropped sine, tight. */
const kick = (gain = 1) => decay(sweep(buf(140), 92, 44, gain), 26);
/** A closed hat: highpassed noise blip. */
const hat = (rnd, gain = 1) => decay(hipass(noise(buf(46), rnd, gain), 0.35), 120);
/** A pluck: filtered triangle-ish partial stack with fast decay. */
const pluck = (f, ms, gain = 1) => {
  const m = buf(ms);
  sweep(m, f, f, gain * 0.7);
  sweep(m, f * 2, f * 2, gain * 0.18);
  sweep(m, f * 3.01, f * 3.01, gain * 0.06);
  onepole(m, 0.35);
  return decay(attack(m, 3), 9);
};
/** A pad voice: detuned pair per note, slow attack, gentle lowpass breathing. */
const padNote = (f, ms, gain = 1) => {
  const m = buf(ms);
  sweep(m, f * 0.997, f * 0.997, gain * 0.5);
  sweep(m, f * 1.003, f * 1.003, gain * 0.5);
  sweep(m, f * 2.002, f * 2.002, gain * 0.12);
  onepole(m, 0.09);
  attack(m, ms * 0.35);
  return fadeOut(m, ms * 0.4);
};
/** A sub note: pure fundamental, slight attack so it never clicks. */
const subNote = (f, ms, gain = 1) => fadeOut(attack(sweep(buf(ms), f, f, gain), 12), ms * 0.2);

/** padNote for HELD (voice-led) notes: same partials, same filter, but the envelope caps at
 *  600ms attack / 900ms release instead of scaling with length — a chord tone held across four
 *  bars must not spend half its life fading in. Used only by the legato beds; the three standard
 *  beds keep padNote untouched. */
const padHeld = (f, ms, gain = 1) => {
  const m = buf(ms);
  sweep(m, f * 0.997, f * 0.997, gain * 0.5);
  sweep(m, f * 1.003, f * 1.003, gain * 0.5);
  sweep(m, f * 2.002, f * 2.002, gain * 0.12);
  onepole(m, 0.09);
  attack(m, Math.min(ms * 0.35, 600));
  return fadeOut(m, Math.min(ms * 0.4, 900));
};

/** VOICE-LEADING: merge a per-bar chord timeline into sustained notes. A pitch present in
 *  consecutive bars is struck ONCE and held through all of them; only the tones that actually
 *  change re-enter. Strictly subtractive smoothness — no event is added that v1 would not have
 *  played, re-strikes of unchanged tones are simply removed. Canon rule 5, applied to harmony. */
const legatoPads = (prog, bars, beatMs, gain) => {
  const events = [];
  const active = new Map(); // "N|oct" -> bar the note entered
  for (let b = 0; b <= bars; b++) {
    const chord = b < bars ? prog[b % prog.length].map(([n, o]) => `${n}|${o}`) : [];
    for (const [key, startBar] of [...active]) {
      if (!chord.includes(key)) {
        const [n, o] = key.split('|');
        events.push({at: at(startBar, 0, beatMs), ch: panTo(padHeld(NOTE(n, Number(o)), beatMs * 4 * (b - startBar) * 1.02, gain), 0)});
        active.delete(key);
      }
    }
    for (const key of chord) if (!active.has(key)) active.set(key, b);
  }
  return events;
};

/* ── the LOFI voices ─────────────────────────────────────────────────────────
 * The chosen expansion direction (user, July 2026): lofi/jazzy grown from bed-pulse-120, with
 * the beat-marking ticks constant on EVERY beat through the whole piece.
 *
 * THE SWING ARITHMETIC that makes "jazzy" legal under the ON-BEAT law: at 120bpm a beat is
 * 30 frames, so a swung (triplet) eighth lands at beat + 20 frames EXACTLY — swing lives on
 * the frame grid at any tempo whose beatFrames divides by 3. Beats stay metronomic always;
 * only subdivisions swing. */

/** Rhodes-ish keys: sine-heavy with a soft bark, long piano decay, the instrument's signature
 *  slow tremolo. The lofi harmony voice — warm, dark, rolled-off. */
const keys = (f, ms, gain = 1) => {
  const m = buf(ms);
  sweep(m, f, f, gain * 0.62);
  sweep(m, f * 2.001, f * 2.001, gain * 0.11);
  sweep(m, f * 3.009, f * 3.009, gain * 0.04);
  onepole(m, 0.16);
  for (let i = 0; i < m.length; i++) m[i] *= 1 + 0.09 * Math.sin(2 * Math.PI * 4.3 * (i / SR));
  decay(m, 1.6);
  attack(m, 6);
  return fadeOut(m, Math.min(ms * 0.35, 700));
};
/** keysBright: the same Rhodes-ish voice opened up — higher filter, lighter tremolo, a touch
 *  more second partial. The sad pair proved the dark voicing reads melancholy; warmth needs
 *  light. */
const keysBright = (f, ms, gain = 1) => {
  const m = buf(ms);
  sweep(m, f, f, gain * 0.58);
  sweep(m, f * 2.001, f * 2.001, gain * 0.16);
  sweep(m, f * 3.009, f * 3.009, gain * 0.05);
  onepole(m, 0.24);
  for (let i = 0; i < m.length; i++) m[i] *= 1 + 0.06 * Math.sin(2 * Math.PI * 4.3 * (i / SR));
  decay(m, 1.5);
  attack(m, 6);
  return fadeOut(m, Math.min(ms * 0.35, 700));
};
/** A shaker: bandpassed noise with a SOFT attack — a swish, not a click. The subdivision
 *  texture for the pure beat maps; the hard tick stays reserved for the beats themselves. */
const shaker = (rnd, gain = 1) => {
  const m = noise(buf(70), rnd, gain);
  bandpass(m, 6500, 0.9);
  attack(m, 18);
  return decay(m, 60, secs(18));
};
/** A clap: three noise bursts a few ms apart (the "many hands") through a low-mid bandpass,
 *  with a looser noise tail. The celebratory backbeat — bigger than a rim, warmer than a hat. */
const clap = (rnd, gain = 1) => {
  const m = buf(220);
  const bursts = [[0, 0.7], [11, 0.85], [23, 1.0]];
  for (const [t, g] of bursts) {
    mix(m, decay(bandpass(noise(buf(30), rnd, g * gain), 1100, 1.6), 180), t);
  }
  mix(m, decay(bandpass(noise(buf(160), rnd, 0.55 * gain), 1300, 1.2), 40), 30);
  return m;
};
/** A snap: a single hollow mid click — high-Q burst around 2.1kHz over a small 850Hz body.
 *  The intimate backbeat: drier and quieter than a clap, for close sections like the CTA. */
const snap = (rnd, gain = 1) => {
  const m = decay(bandpass(noise(buf(70), rnd, gain), 2100, 2.5), 120);
  mix(m, decay(bandpass(noise(buf(50), rnd, gain * 0.5), 850, 3), 150));
  return m;
};
/** The LEAD — a celesta/music-box bell, built to PAIR with keysBright instead of blending
 *  into it. Three contrast axes, on purpose: brighter (open filter, bell partial at 4.02x),
 *  more percussive (2ms attack, faster decay), and NO tremolo — a lead that wobbles reads as
 *  wavering, and two voices sharing one LFO rate fuse into a single fat instrument, which is
 *  exactly the mistake this voice exists to fix. Played an octave above the chord voicings. */
const lead = (f, ms, gain = 1) => {
  const m = buf(ms);
  sweep(m, f, f, gain * 0.55);
  sweep(m, f * 2.0, f * 2.0, gain * 0.1);
  sweep(m, f * 4.02, f * 4.02, gain * 0.05);
  onepole(m, 0.5);
  decay(m, 2.2);
  attack(m, 2);
  return fadeOut(m, Math.min(ms * 0.3, 400));
};
/** A rim tick: a small woody click, rounder and quieter than a hat — the 2-and-4 backbeat. */
const rim = (rnd, gain = 1) => decay(bandpass(noise(buf(40), rnd, gain), 1800, 2.2), 90);
/** Vinyl crackle: sparse seeded pops through a lowpass, laid under the whole bed. The lofi
 *  signifier, kept far below the music — texture, never an event. */
const crackleLayer = (seed, totalMs, gain) => {
  const rnd = mulberry32(seed);
  const m = buf(totalMs);
  const pops = Math.floor((totalMs / 1000) * 22);
  for (let k = 0; k < pops; k++) {
    const pAt = Math.floor(rnd() * (m.length - 40));
    const amp = gain * (0.15 + 0.85 * Math.pow(rnd(), 3));
    for (let j = 0; j < 24; j++) m[pAt + j] += (rnd() * 2 - 1) * amp * Math.exp(-j / 5);
  }
  onepole(m, 0.32);
  return m;
};

/** Render a bed from a spec of layered event generators. totalMs must sit on the grid. */
const renderBed = ({bpm, bars, layers, drive}) => {
  const beatMs = 60000 / bpm;
  const totalMs = beatMs * 4 * bars;
  const L = buf(totalMs);
  const R = buf(totalMs);
  for (const layer of layers) {
    for (const ev of layer({beatMs, bars})) {
      const [l, r] = Array.isArray(ev.ch[0]) || ev.ch[0] instanceof Float64Array ? ev.ch : [ev.ch, ev.ch];
      mix(L, l, ev.at);
      mix(R, r, ev.at);
    }
  }
  saturate(L, drive);
  saturate(R, drive);
  return [L, R];
};

const at = (bar, sixteenth, beatMs) => bar * 4 * beatMs + (sixteenth * beatMs) / 4;

const BEDS = {
  /* 120 BPM = exactly 30 frames/beat. The house default: sub pulse, soft four-kick,
   * off-beat air, sparse A-minor plucks. Quiet confidence, GPT-5.5 school. */
  'bed-pulse-120': {
    bpm: 120,
    bars: 16,
    drive: 1.25,
    layers: [
      ({beatMs, bars}) => {
        const out = [];
        const roots = ['A', 'A', 'F', 'G'];
        for (let b = 0; b < bars; b++) {
          out.push({at: at(b, 0, beatMs), ch: panTo(subNote(NOTE(roots[b % 4], 1), beatMs * 4, 0.5), 0)});
        }
        return out;
      },
      ({beatMs, bars}) => {
        const out = [];
        for (let b = 0; b < bars; b++)
          for (let q = 0; q < 4; q++) out.push({at: at(b, q * 4, beatMs), ch: panTo(kick(0.55), 0)});
        return out;
      },
      ({beatMs, bars}) => {
        const rnd = mulberry32(201);
        const out = [];
        for (let b = 0; b < bars; b++)
          for (let q = 0; q < 4; q++) out.push({at: at(b, q * 4 + 2, beatMs), ch: panTo(hat(rnd, 0.16), 0.35)});
        return out;
      },
      ({beatMs, bars}) => {
        const out = [];
        const line = [['A', 3, 0], ['C', 3, 6], ['E', 3, 8], ['G', 3, 14]];
        for (let b = 1; b < bars; b += 2) {
          for (const [n, o, s] of line) out.push({at: at(b, s, beatMs), ch: panTo(pluck(NOTE(n, o), 420, 0.22), s % 4 === 0 ? -0.3 : 0.3)});
        }
        return out;
      },
      ({beatMs, bars}) => {
        const out = [];
        const chords = [
          [['A', 2], ['C', 3], ['E', 3]],
          [['F', 2], ['A', 2], ['C', 3]],
        ];
        for (let b = 0; b < bars; b += 4) {
          const ch = chords[(b / 4) % 2];
          for (const [n, o] of ch) out.push({at: at(b, 0, beatMs), ch: panTo(padNote(NOTE(n, o), beatMs * 16, 0.16), 0)});
        }
        return out;
      },
    ],
  },


  /* ══ THE WARM PAIR — lofi without the melancholy ══════════════════════════
   * The sad pair's mistake was harmonic: Dm7→G7→Cmaj7→Am7 begins and ends minor. This vamp is
   * C6 → Fmaj7 — major-sixth warmth, and the two chords share THREE of four tones (E, A, C
   * hold; only G↔F moves): the smoothest possible harmonic motion, and sunny by construction.
   * Same pulse skeleton, keys voiced brighter, crackle floor, beat ticks on every beat always.
   * bed-warm-120 is straight; bed-warm-swing-120 swings the subdivisions (+20f exact). */
  'bed-warm-120': {
    bpm: 120,
    bars: 16,
    drive: 1.2,
    layers: [
      ({beatMs, bars}) => [{at: 0, ch: panTo(crackleLayer(621, beatMs * 4 * bars, 0.024), 0)}],
      ({beatMs, bars}) => {
        const out = [];
        const roots = [['C', 1], ['C', 1], ['F', 1], ['F', 1]];
        for (let b = 0; b < bars; b++) {
          const [n, o] = roots[b % 4];
          out.push({at: at(b, 0, beatMs), ch: panTo(subNote(NOTE(n, o), beatMs * 4, 0.46), 0)});
        }
        return out;
      },
      ({beatMs, bars}) => {
        const out = [];
        for (let b = 0; b < bars; b++)
          for (const q of [0, 2]) out.push({at: at(b, q * 4, beatMs), ch: panTo(kick(0.5), 0)});
        return out;
      },
      ({beatMs, bars}) => {
        const rnd = mulberry32(622);
        const out = [];
        for (let b = 0; b < bars; b++)
          for (const q of [1, 3]) out.push({at: at(b, q * 4, beatMs), ch: panTo(rim(rnd, 0.17), 0.15)});
        return out;
      },
      ({beatMs, bars}) => {
        // the beat ticks: every beat, every bar, constant — the metronome inside the music
        const rnd = mulberry32(623);
        const out = [];
        for (let b = 0; b < bars; b++)
          for (let q = 0; q < 4; q++) out.push({at: at(b, q * 4, beatMs), ch: panTo(hat(rnd, 0.11), 0.3)});
        return out;
      },
      ({beatMs, bars}) => {
        const out = [];
        const voicings = [
          [['E', 3], ['G', 3], ['A', 3], ['C', 4]], // C6  (E G A C)
          [['E', 3], ['G', 3], ['A', 3], ['C', 4]],
          [['E', 3], ['F', 3], ['A', 3], ['C', 4]], // Fmaj7 (E F A C) — only G→F moved
          [['E', 3], ['F', 3], ['A', 3], ['C', 4]],
        ];
        for (let b = 0; b < bars; b++) {
          for (const [n, o] of voicings[b % 4]) {
            out.push({at: at(b, 0, beatMs), ch: panTo(keysBright(NOTE(n, o), beatMs * 3.6, 0.15), -0.1)});
            out.push({at: at(b, 8, beatMs), ch: panTo(keysBright(NOTE(n, o), beatMs * 1.8, 0.075), 0.15)});
          }
        }
        return out;
      },
    ],
  },

  'bed-warm-swing-120': {
    bpm: 120,
    bars: 16,
    drive: 1.2,
    layers: [
      ({beatMs, bars}) => [{at: 0, ch: panTo(crackleLayer(631, beatMs * 4 * bars, 0.024), 0)}],
      ({beatMs, bars}) => {
        // root on the bar, the fifth on the swung and-of-3 — gentle motion, still sunny
        const out = [];
        const moves = [[['C', 1], ['G', 1]], [['C', 1], ['G', 1]], [['F', 1], ['C', 2]], [['F', 1], ['C', 2]]];
        for (let b = 0; b < bars; b++) {
          const [[rn, ro], [fn, fo]] = moves[b % 4];
          out.push({at: at(b, 0, beatMs), ch: panTo(subNote(NOTE(rn, ro), beatMs * 2.6, 0.46), 0)});
          out.push({at: at(b, 0, beatMs) + beatMs * (2 + 2 / 3), ch: panTo(subNote(NOTE(fn, fo), beatMs * 1.2, 0.28), 0)});
        }
        return out;
      },
      ({beatMs, bars}) => {
        const out = [];
        for (let b = 0; b < bars; b++) {
          out.push({at: at(b, 0, beatMs), ch: panTo(kick(0.5), 0)});
          out.push({at: at(b, 0, beatMs) + beatMs * (1 + 2 / 3), ch: panTo(kick(0.32), 0)});
        }
        return out;
      },
      ({beatMs, bars}) => {
        const rnd = mulberry32(632);
        const out = [];
        for (let b = 0; b < bars; b++)
          for (const q of [1, 3]) out.push({at: at(b, q * 4, beatMs), ch: panTo(rim(rnd, 0.17), 0.15)});
        return out;
      },
      ({beatMs, bars}) => {
        // ticks on every beat, swung eighths after (+20f exact at 120)
        const rnd = mulberry32(633);
        const out = [];
        for (let b = 0; b < bars; b++)
          for (let q = 0; q < 4; q++) {
            out.push({at: at(b, q * 4, beatMs), ch: panTo(hat(rnd, 0.11), 0.3)});
            out.push({at: at(b, q * 4, beatMs) + (beatMs * 2) / 3, ch: panTo(hat(rnd, 0.05), -0.2)});
          }
        return out;
      },
      ({beatMs, bars}) => {
        const out = [];
        const voicings = [
          [['E', 3], ['G', 3], ['A', 3], ['C', 4]],
          [['E', 3], ['G', 3], ['A', 3], ['C', 4]],
          [['E', 3], ['F', 3], ['A', 3], ['C', 4]],
          [['E', 3], ['F', 3], ['A', 3], ['C', 4]],
        ];
        for (let b = 0; b < bars; b++) {
          for (const [n, o] of voicings[b % 4]) {
            out.push({at: at(b, 0, beatMs), ch: panTo(keysBright(NOTE(n, o), beatMs * 3.2, 0.15), -0.1)});
            out.push({at: at(b, 0, beatMs) + beatMs * (2 / 3), ch: panTo(keysBright(NOTE(n, o), beatMs * 0.9, 0.055), 0.2)});
          }
        }
        return out;
      },
    ],
  },
  /* ══ THE PURE BEAT MAPS — rhythm as the whole piece ═══════════════════════
   * No harmony at all: the beat ticks the user loves, promoted from timekeeper to subject.
   * A head-nod one-bar groove (boom … ba-boom on the and-of-3, rim backbeat on 2 and 4),
   * ticks on EVERY beat, shaker 8ths breathing underneath. The kick's pitch-drop is the only
   * low end — nothing minor, nothing sad, nothing to compete with the picture's story.
   * Straight 8ths in bed-beat-120 (15f positions); swung (+20f exact) in the swing one. */
  'bed-beat-120': {
    bpm: 120,
    bars: 16,
    drive: 1.2,
    layers: [
      ({beatMs, bars}) => {
        // boom on 1, ba-boom on the and-of-3 — the head-nod
        const out = [];
        for (let b = 0; b < bars; b++) {
          out.push({at: at(b, 0, beatMs), ch: panTo(kick(0.52), 0)});
          out.push({at: at(b, 10, beatMs), ch: panTo(kick(0.38), 0)});
        }
        return out;
      },
      ({beatMs, bars}) => {
        const rnd = mulberry32(641);
        const out = [];
        for (let b = 0; b < bars; b++)
          for (const q of [1, 3]) out.push({at: at(b, q * 4, beatMs), ch: panTo(rim(rnd, 0.19), 0.12)});
        return out;
      },
      ({beatMs, bars}) => {
        // the beat ticks: every beat, every bar, constant
        const rnd = mulberry32(642);
        const out = [];
        for (let b = 0; b < bars; b++)
          for (let q = 0; q < 4; q++) out.push({at: at(b, q * 4, beatMs), ch: panTo(hat(rnd, 0.12), 0.3)});
        return out;
      },
      ({beatMs, bars}) => {
        // shaker 8ths — softer on the offs, so the grid breathes without a second tick
        const rnd = mulberry32(643);
        const out = [];
        for (let b = 0; b < bars; b++)
          for (let e = 0; e < 8; e++)
            out.push({at: at(b, e * 2, beatMs), ch: panTo(shaker(rnd, e % 2 ? 0.038 : 0.055), e % 2 ? -0.25 : 0.2)});
        return out;
      },
    ],
  },

  'bed-beat-swing-120': {
    bpm: 120,
    bars: 16,
    drive: 1.2,
    layers: [
      ({beatMs, bars}) => {
        // boom on 1, the answer laid back on the swung and-of-2
        const out = [];
        for (let b = 0; b < bars; b++) {
          out.push({at: at(b, 0, beatMs), ch: panTo(kick(0.52), 0)});
          out.push({at: at(b, 0, beatMs) + beatMs * (1 + 2 / 3), ch: panTo(kick(0.36), 0)});
        }
        return out;
      },
      ({beatMs, bars}) => {
        const rnd = mulberry32(651);
        const out = [];
        for (let b = 0; b < bars; b++)
          for (const q of [1, 3]) out.push({at: at(b, q * 4, beatMs), ch: panTo(rim(rnd, 0.19), 0.12)});
        return out;
      },
      ({beatMs, bars}) => {
        const rnd = mulberry32(652);
        const out = [];
        for (let b = 0; b < bars; b++)
          for (let q = 0; q < 4; q++) out.push({at: at(b, q * 4, beatMs), ch: panTo(hat(rnd, 0.12), 0.3)});
        return out;
      },
      ({beatMs, bars}) => {
        // shaker swings: on the beat and on the swung eighth (+20f exact)
        const rnd = mulberry32(653);
        const out = [];
        for (let b = 0; b < bars; b++)
          for (let q = 0; q < 4; q++) {
            out.push({at: at(b, q * 4, beatMs), ch: panTo(shaker(rnd, 0.055), 0.2)});
            out.push({at: at(b, q * 4, beatMs) + (beatMs * 2) / 3, ch: panTo(shaker(rnd, 0.036), -0.25)});
          }
        return out;
      },
    ],
  },
};

/* ============================================================================
 * generate + verify
 * ========================================================================== */
const generate = (sfxDir, musicDir) => {
  mkdirSync(sfxDir, {recursive: true});
  mkdirSync(musicDir, {recursive: true});
  const manifest = {sfx: {}, music: {}, sr: SR, oneShotPeakDb: -15, bedPeakDb: -1.5};

  for (const [name, make] of Object.entries(SFX)) {
    const made = make();
    const raw = made.ch ?? made;
    // ghost keeps its authored 0.32 gain (a normalized ghost is not a ghost) — but still
    // dc-blocked + demeaned, and its peak must sit UNDER the ceiling, which --verify asserts.
    let ch;
    if (made.noNormalize) {
      for (const c of raw) dcBlock(c);
      ch = demean(raw);
    } else {
      ch = master(raw, PEAK_ONESHOT);
    }
    writeFileSync(resolve(sfxDir, `${name}.wav`), wav(ch));
    manifest.sfx[`${name}.wav`] = {ms: Math.round((ch[0].length / SR) * 1000)};
  }
  for (const [name, spec] of Object.entries(BEDS)) {
    const ch = master(renderBed(spec), PEAK_BED);
    writeFileSync(resolve(musicDir, `${name}.wav`), wav(ch));
    manifest.music[`${name}.wav`] = {
      ms: Math.round((ch[0].length / SR) * 1000),
      bpm: spec.bpm,
      framesPerBeat: 3600 / spec.bpm,
      bars: spec.bars,
    };
  }
  return manifest;
};

const measure = (file) => {
  const b = readFileSync(file);
  const n = (b.length - 44) / 4;
  let peak = 0, sumL = 0, sumR = 0;
  for (let i = 0; i < n; i++) {
    const l = b.readInt16LE(44 + i * 4) / 32768;
    const r = b.readInt16LE(46 + i * 4) / 32768;
    peak = Math.max(peak, Math.abs(l), Math.abs(r));
    sumL += l; sumR += r;
  }
  return {ms: Math.round((n / SR) * 1000), peakDb: 20 * Math.log10(peak || 1e-9), dc: Math.max(Math.abs(sumL / n), Math.abs(sumR / n))};
};

const main = () => {
  const mode = process.argv[2] ?? '';
  if (mode === '--prove') {
    const t1 = resolve(ROOT, '.cache-audio', 'prove-a');
    const t2 = resolve(ROOT, '.cache-audio', 'prove-b');
    for (const t of [t1, t2]) rmSync(t, {recursive: true, force: true});
    generate(resolve(t1, 'sfx'), resolve(t1, 'music'));
    generate(resolve(t2, 'sfx'), resolve(t2, 'music'));
    const hashDir = (d) => {
      const h = createHash('sha256');
      for (const [name] of [...Object.entries(SFX), ...Object.entries(BEDS)].sort()) {
        const p = resolve(d, 'sfx', `${name}.wav`);
        try { h.update(readFileSync(p)); } catch { h.update(readFileSync(resolve(d, 'music', `${name}.wav`))); }
      }
      return h.digest('hex');
    };
    const a = hashDir(t1), b2 = hashDir(t2);
    console.log(a === b2 ? `✓ deterministic: two runs byte-identical (${a.slice(0, 12)}…)` : `✗ NON-DETERMINISTIC: ${a} vs ${b2}`);
    process.exit(a === b2 ? 0 : 1);
  }

  const sfxDir = resolve(ROOT, 'public', 'sfx');
  const musicDir = resolve(ROOT, 'public', 'music');
  const manifest = generate(sfxDir, musicDir);
  writeFileSync(resolve(ROOT, 'public', 'kit-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`✓ kit: ${Object.keys(manifest.sfx).length} one-shots → public/sfx, ${Object.keys(manifest.music).length} beds → public/music`);

  if (mode === '--verify') {
    const fails = [];
    // Slot fits — these names are CONTRACTS with CUE_MS in src/promo/sound.ts.
    const slotOf = {'kit-tick': 60, 'kit-tick-soft': 60, 'kit-rise': 90, 'kit-swap': 180, 'kit-zip': 100, 'kit-whoosh-out': 150, 'kit-glide': 900, 'kit-pop': 430, 'kit-accent': 1000};
    for (const [f, meta] of Object.entries(manifest.sfx)) {
      const m = measure(resolve(sfxDir, f));
      const want = slotOf[f.replace('.wav', '')];
      if (want && m.ms !== want) fails.push(`${f}: ${m.ms}ms but its cue slot is ${want}ms`);
      if (m.peakDb > -14.9) fails.push(`${f}: peak ${m.peakDb.toFixed(2)} dBFS above the −15 ceiling`);
      if (m.dc > 1e-4) fails.push(`${f}: DC offset ${m.dc.toExponential(2)} (ui-swap lesson)`);
      if (meta.ms !== m.ms) fails.push(`${f}: manifest says ${meta.ms}ms, file is ${m.ms}ms`);
    }
    for (const [f, meta] of Object.entries(manifest.music)) {
      const m = measure(resolve(musicDir, f));
      if (m.peakDb > -1.4) fails.push(`${f}: peak ${m.peakDb.toFixed(2)} dBFS above −1.5`);
      if (m.peakDb < -4) fails.push(`${f}: peak ${m.peakDb.toFixed(2)} dBFS — undershooting the master`);
      if (m.dc > 1e-4) fails.push(`${f}: DC offset ${m.dc.toExponential(2)}`);
      if (!Number.isInteger(meta.framesPerBeat)) fails.push(`${f}: ${meta.bpm} BPM is ${meta.framesPerBeat} frames/beat — NOT on the 60fps grid`);
      const beatMs = 60000 / meta.bpm;
      const expectMs = beatMs * 4 * meta.bars;
      if (Math.abs(m.ms - expectMs) > 1) fails.push(`${f}: ${m.ms}ms but ${meta.bars} bars at ${meta.bpm} BPM is ${expectMs}ms`);
    }
    if (fails.length) {
      console.error(`✗ audio kit: ${fails.length} problem(s)`);
      for (const f of fails) console.error(`  • ${f}`);
      process.exit(1);
    }
    console.log(`✓ verified: slot lengths exact, one-shots ≤ −15 dBFS, beds at −1.5 dBFS, no DC, every bed on the frame grid`);
  }
};

// Run only when invoked directly — compose-score.mjs imports this file as the voice toolkit.
const invoked = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invoked) main();

export {
  SR, PEAK_BED, mulberry32, secs, buf, sweep, noise, onepole, hipass, bandpass, decay, attack,
  fadeOut, dcBlock, mix, scale, demean, master, saturate, panTo, panSweep, wav, NOTE,
  kick, hat, rim, shaker, clap, snap, keys, keysBright, lead, subNote,
};
