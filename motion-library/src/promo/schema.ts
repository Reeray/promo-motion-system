import {TEXT_EFFECT_IDS} from '../blocks/animate-text';
import {SURFACES} from './surfaces';

/* ============================================================================
 * PROMODOC — a promo as data.
 *
 * THE STANDING RULE: this document contains NO DERIVED NUMBERS. Copy strings, block ids and
 * size/hold tokens carry everything the renderer COMPUTES from — there is no field for a frame,
 * a millisecond, an easing, a colour or a font size, so the locked-motion law holds because
 * motion is UNREPRESENTABLE here, not because a rule asks nicely.
 *
 * The single admitted exception is `framing` on a ui scene (below): an authored CAMERA — zoom and
 * a fractional x/y offset — over a surface. It is allowed precisely because nothing in this repo
 * DERIVES a camera; sceneFrames() cannot reach it (gate P5 proves this), so it duplicates no
 * computed value. It relocates the hand-typed ZOOM/PIN constants that used to live inside a
 * surface file up to the doc layer that should author them. See "NO DERIVED NUMBERS" in SKILL.md.
 *
 * No zod. It is not a declared dependency (present only transitively via Remotion, built
 * against a different major), and the whole validation need is array membership plus four
 * cross-field rules — about fifty lines. Hand-rolling also removes the sharpest parity
 * hazard: a `.default()` applied on the render path but not the preview path. `normalize()`
 * runs once, inside prepare(), and both call sites consume only its output.
 * ========================================================================== */

export const FPS = 60;
export const WIDTH = 1280;
export const HEIGHT = 720;

/* ── SURFACE FRAMING — the one authored-geometry field ──────────────────────────────────────
 * A camera over a ui surface: `zoom` is a dimensionless multiplier, `x`/`y` are FRACTIONS of the
 * frame (so they stay correct if WIDTH/HEIGHT ever change — a pixel offset would be a second
 * source of truth for the frame size, a fraction is not). Identity is zoom 1, no offset. */
export type Framing = {zoom: number; x: number; y: number};
export const FRAMING_ID: Framing = {zoom: 1, x: 0, y: 0};

/* Bounds and quantisation. `bleedMin` is 1 because a BLEED surface IS the viewport — scaling it
 * below 1 would expose bare stage around it (see MACRO CROP). The steps keep an authored diff
 * reviewable: zoom to 1/100, offset to 1/1000 of the frame. */
export const FRAMING_BOUNDS = {
  zoom: {min: 0.5, bleedMin: 1, max: 4, step: 0.01},
  offset: {min: -1, max: 1, step: 0.001},
} as const;

const clampQ = (v: number, lo: number, hi: number, step: number): number => {
  const n = Number.isFinite(v) ? v : 0;
  return Math.round(Math.min(hi, Math.max(lo, n)) / step) * step;
};

export const isIdentity = (f: Framing | undefined): boolean =>
  !f || (f.zoom === 1 && f.x === 0 && f.y === 0);

/** Force a framing into range and onto the quantisation grid. The EDITOR runs this on both the
 *  live gesture and the commit, so what the preview shows and what the doc stores are identical
 *  and can never fall outside what the renderer will accept. `bleed` raises the zoom floor. */
export const clampFraming = (f: Framing | undefined, bleed: boolean): Framing => {
  if (!f) return FRAMING_ID;
  const z = FRAMING_BOUNDS.zoom, o = FRAMING_BOUNDS.offset;
  return {
    zoom: clampQ(f.zoom, bleed ? z.bleedMin : z.min, z.max, z.step),
    x: clampQ(f.x, o.min, o.max, o.step),
    y: clampQ(f.y, o.min, o.max, o.step),
  };
};

/** Rest after the enter lands, in ms. Not a timing knob — three named paces. */
export const HOLD = {short: 350, normal: 550, long: 900} as const;

/** Type scale. `xl` exists because the hand-authored promos used 52 and 62px, which both
 *  quantised into `lg` and flattened a deliberate title/payoff contrast. */
export const SIZE = {sm: 34, md: 48, lg: 56, xl: 64} as const;

/** Frames of rest between an intro landing and the outro starting. See prepare(). */
export const MIN_SETTLE = 2;

/* Slot vocabularies. Mirrors the `tag` field on TRANSITION_BLOCKS: the two `full-tro`
 * entries (axis-handoff, depth-handoff) are deliberately NOT selectable here — a handoff is
 * composed from sceneA.exit + sceneB.enter, and the editor presents that pair as one
 * full-tro block when the two halves match. `frames` mirrors transitions.tsx at 60fps and
 * is what gives prepare() its intro floor. */
export const INTRO = {
  'glide-in': {label: 'Glide in', axis: 'x', frames: 54},
  'scale-pop-in': {label: 'Scale pop', axis: 'z', frames: 26},
} as const;

export const OUTRO = {
  'push-off-left': {label: 'Push off', axis: 'x', frames: 9},
  'scale-up-cut': {label: 'Scale cut', axis: 'z', frames: 6},
} as const;

/** The outro+intro pairs that ARE a named library transition. Used by the editor to collapse
 *  a matching junction into a single full-tro block. */
export const FULL_TRO: Record<string, {o: OutroId; i: IntroId}> = {
  'axis-handoff': {o: 'push-off-left', i: 'glide-in'},
  'depth-handoff': {o: 'scale-up-cut', i: 'scale-pop-in'},
};

export type IntroId = keyof typeof INTRO;
export type OutroId = keyof typeof OUTRO;
export type SizeTok = keyof typeof SIZE;
export type HoldTok = keyof typeof HOLD;

/* ── Raw: what the editor writes to disk. Optionals allowed. ───────────────── */
type BaseRaw = {id: string; enter?: IntroId; exit?: OutroId; hold?: HoldTok; framing?: Framing};
export type TextSceneRaw = BaseRaw & {kind: 'text'; effect: string; copy: string; sub?: string; size?: SizeTok};
export type UiSceneRaw = BaseRaw & {kind: 'ui'; surface: string};
export type SceneRaw = TextSceneRaw | UiSceneRaw;
/* THREE stages, not two. `soft-light` and `light` are both light — they differ in HOW a surface
 * separates from the void it sits in:
 *   soft-light  white stage, white card, separation by SHADOW      (the [C] house default)
 *   light       dimmer stage, pure-white card, separation by CONTRAST
 * Pick soft-light unless the product UI you captured needs to read as a distinctly white sheet
 * against something. */
export type Theme = 'soft-light' | 'light' | 'dark';
export const THEMES: Theme[] = ['soft-light', 'light', 'dark'];

export type PromoDocRaw = {v: 1; id: string; theme?: Theme; scenes: SceneRaw[]};

/* ── Normalized: what components see. Every field present. ─────────────────── */
type Base = {id: string; enter: IntroId; exit: OutroId; hold: HoldTok};
/* `framing?` is carried on TextScene ONLY so validate can reject it — a camera on text is
 *  meaningless and a sign of a hand-edited doc. Promo.tsx reads framing on ui scenes exclusively. */
export type TextScene = Base & {kind: 'text'; effect: string; copy: string; sub: string | null; size: SizeTok; framing?: Framing};
export type UiScene = Base & {kind: 'ui'; surface: string; framing: Framing};
export type Scene = TextScene | UiScene;
export type PromoDoc = {v: 1; id: string; theme: Theme; scenes: Scene[]};

export const DEFAULTS = {enter: 'glide-in' as IntroId, exit: 'push-off-left' as OutroId, hold: 'normal' as HoldTok, size: 'lg' as SizeTok};

export const normalize = (raw: PromoDocRaw): PromoDoc => ({
  v: 1,
  id: raw.id,
  theme: raw.theme ?? 'soft-light',
  scenes: (raw.scenes ?? []).map((s) => {
    const base = {id: s.id, enter: s.enter ?? DEFAULTS.enter, exit: s.exit ?? DEFAULTS.exit, hold: s.hold ?? DEFAULTS.hold};
    // ui: clamp framing here so BOTH the render path (calculateMetadata → prepare) and the editor
    // land on the same in-range value — a hand-edited zoom:99 renders clamped, not blinding-huge.
    // text: pass framing THROUGH unchanged (illegal, but validate must see it to reject it).
    return s.kind === 'ui'
      ? ({...base, kind: 'ui', surface: s.surface, framing: clampFraming(s.framing, SURFACES[s.surface]?.bleed ?? false)} as UiScene)
      : ({...base, kind: 'text', effect: s.effect, copy: s.copy, sub: s.sub ?? null, size: s.size ?? DEFAULTS.size, ...(s.framing !== undefined ? {framing: s.framing} : {})} as TextScene);
  }),
});

/** Returns [] when valid. Messages name the scene, so an editor can point at a row. */
export const validate = (doc: PromoDoc): string[] => {
  const errs: string[] = [];
  const n = doc.scenes.length;
  if (n < 1 || n > 12) errs.push(`a promo needs 1–12 scenes, got ${n}`);

  const seen = new Set<string>();
  for (const s of doc.scenes) {
    if (seen.has(s.id)) errs.push(`duplicate scene id "${s.id}"`);
    seen.add(s.id);
    if (!(s.enter in INTRO)) errs.push(`scene "${s.id}": unknown intro "${s.enter}"`);
    if (!(s.exit in OUTRO)) errs.push(`scene "${s.id}": unknown outro "${s.exit}"`);
    if (s.kind === 'text') {
      if (!TEXT_EFFECT_IDS.includes(s.effect)) errs.push(`scene "${s.id}": unknown text effect "${s.effect}"`);
      if (!s.copy?.trim()) errs.push(`scene "${s.id}": copy is empty`);
      if (!(s.size in SIZE)) errs.push(`scene "${s.id}": unknown size token "${s.size}"`);
      if (s.framing !== undefined) errs.push(`scene "${s.id}": text scenes cannot carry framing — a camera is for ui surfaces only`);
    } else if (!SURFACES[s.surface]) {
      errs.push(`scene "${s.id}": unknown surface "${s.surface}"`);
    }
    if (!(s.hold in HOLD)) errs.push(`scene "${s.id}": unknown hold token "${s.hold}"`);
  }
  return errs;
};

/** Framing pushed so far the surface has mostly left the frame. A WARNING, never an error — an
 *  extreme crop can be deliberate (MACRO CROP pins a surface partly off-frame on purpose), and the
 *  editor clamps within bounds anyway. This only catches gross whole-surface off-framing; it does
 *  NOT verify that an exercised control stayed whole (a surface declares no control rectangle). */
export const framingWarnings = (doc: PromoDoc): string[] => {
  const out: string[] = [];
  for (const s of doc.scenes) {
    if (s.kind !== 'ui' || isIdentity(s.framing)) continue;
    const f = s.framing;
    if (Math.abs(f.x) > 0.45 || Math.abs(f.y) > 0.45 || f.zoom < 0.6) {
      out.push(`scene "${s.id}": framing (zoom ${f.zoom}, offset ${f.x}/${f.y}) pushes the surface far off-centre — check it still reads.`);
    }
  }
  return out;
};

/* Axis adjacency is a WARNING, not an error. The editor's primary action is swapping a whole
 * full-tro, which sets both halves at once, so a mismatch is something you must deliberately
 * construct via the per-half controls. (The hand-authored storage promo contains one: it exits
 * push-off-left on X into scale-pop-in on Z.) Blocking it would refuse to load real work. */
export const axisWarnings = (doc: PromoDoc): string[] => {
  const out: string[] = [];
  for (let i = 0; i < doc.scenes.length - 1; i++) {
    const a = doc.scenes[i], b = doc.scenes[i + 1];
    const ax = OUTRO[a.exit]?.axis, bx = INTRO[b.enter]?.axis;
    if (ax && bx && ax !== bx) {
      out.push(`handoff ${i + 1} ("${a.id}" → "${b.id}"): outro is ${ax.toUpperCase()}-axis, intro is ${bx.toUpperCase()}-axis — the measured handoff law wants one continuous axis.`);
    }
  }
  return out;
};

/** The named full-tro for a junction, or null when the halves don't form one. */
export const fullTroFor = (exit: OutroId, enter: IntroId): string | null => {
  for (const [name, p] of Object.entries(FULL_TRO)) if (p.o === exit && p.i === enter) return name;
  return null;
};
