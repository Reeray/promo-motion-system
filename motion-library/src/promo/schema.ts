import {TEXT_EFFECT_IDS} from '../blocks/animate-text';
import {SURFACES} from './surfaces';
import type {GainTok, MusicLevelTok} from './sound-kinds';
import {GAIN, MUSIC_LEVEL} from './sound-kinds';

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
type BaseRaw = {id: string; enter?: IntroId; exit?: OutroId; hold?: HoldTok; framing?: Framing; entry?: EntryTok};
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
/** Promo-wide narration font. 'hf' = the product font (Source Sans 3) for brand-matched
 *  promos — ruled on hf-blog-editor: stage text and surface text must not mix families. */
export type FontTok = 'inter' | 'hf';
export const THEMES: Theme[] = ['soft-light', 'light', 'dark'];

/* ── SOUND ──────────────────────────────────────────────────────────────────────────────────
 * Cue TIMES are derived (src/promo/sound.ts), so nothing here declares one. What a doc may carry
 * is the authored part: whether sound is on, an optional music bed, and per-cue adjustments.
 *
 * `nudge` is the second admitted authored number, on the same footing as `framing` — it is an
 * OFFSET to a derived anchor, not a copy of one, so it shadows nothing (gate P6 proves audio never
 * reaches a frame count). It is MILLISECONDS, never frames: frames would make it a second source
 * of truth for fps. Everything else is a token. */
/** `off` is how a DERIVED cue is "deleted": its time comes from the motion, so it cannot be
 *  removed from the doc the way a custom cue can — it would just derive back on the next
 *  prepare(). The flag suppresses it while keeping any nudge/src it carried, so restoring is
 *  lossless rather than a re-authoring job. */
export type SoundCueOverride = {nudge?: number; src?: string; gain?: GainTok; off?: boolean};

/** A USER-ADDED cue — the third authored number, same footing as `framing` and `nudge`.
 *
 * `at` is MILLISECONDS from the owning scene's start, never a frame (frames would shadow fps) and
 * never absolute (an absolute time silently detaches from its event when an earlier scene changes
 * length — anchoring to a scene makes the cue travel with what it belongs to). Its src/gain live
 * HERE, not in the overrides map, so a custom cue has exactly one home in the doc. */
export type CustomCue = {id: string; scene: string; at: number; src?: string; gain?: GainTok};

export type PromoSound = {
  sfx?: 'on' | 'off';
  /** `fade: 'none'` marks a COMPOSED SCORE rather than a looping bed: a score authored to the
   *  doc's own timeline (scripts/compose-score.mjs) carries its own opening and ending, and the
   *  render's automatic 45-frame bed fade would damage both. Default 'auto' = bed behaviour. */
  music?: {src: string; level?: MusicLevelTok; fade?: 'auto' | 'none'};
  cues?: Record<string, SoundCueOverride>;
  custom?: CustomCue[];
};

/** ±500 ms, quantised to 1 ms. Beyond half a second a cue has stopped belonging to its event. */
export const NUDGE_BOUNDS = {min: -500, max: 500, step: 1} as const;

export const clampNudge = (ms: number | undefined): number => {
  if (ms === undefined || !Number.isFinite(ms)) return 0;
  const {min, max, step} = NUDGE_BOUNDS;
  return Math.round(Math.min(max, Math.max(min, ms)) / step) * step;
};

/** THE BEAT GRID — the ON-BEAT law's mechanism. `bpm` is the fourth authored number: a fact
 *  about the music the piece is cut to, underivable from anything in the doc. prepare() rounds
 *  every scene UP to whole beats (the padding extends the settle before the outro), so every CUT
 *  lands exactly on a beat — on-beat as arithmetic, not nudging.
 *
 *  Deliberately NOT inside `sound`: gate P6 proves audio can never change a frame count by
 *  stripping the whole sound block. Timing structure that CHANGES durations therefore cannot
 *  live there — the grid is rhythm the picture is cut to, whether or not any audio is present. */
export type PromoGrid = {bpm: number};

export type PromoDocRaw = {v: 1; id: string; theme?: Theme; font?: FontTok; scenes: SceneRaw[]; sound?: PromoSound; grid?: PromoGrid};

/* ── Normalized: what components see. Every field present. ─────────────────── */
type Base = {id: string; enter: IntroId; exit: OutroId; hold: HoldTok; entry: EntryTok};
/* `framing?` is carried on TextScene ONLY so validate can reject it — a camera on text is
 *  meaningless and a sign of a hand-edited doc. Promo.tsx reads framing on ui scenes exclusively. */
export type TextScene = Base & {kind: 'text'; effect: string; copy: string; sub: string | null; size: SizeTok; framing?: Framing};
export type UiScene = Base & {kind: 'ui'; surface: string; framing: Framing};
export type Scene = TextScene | UiScene;
export type PromoDoc = {v: 1; id: string; theme: Theme; font: FontTok; scenes: Scene[]; sound: PromoSound; grid?: PromoGrid};

/** CONTENT RIDES THE TRANSITION (measured from the reference A/B, July 2026): a route change
 *  is ONE motion, and the incoming scene's content rides inside it. `entry` sets WHEN the
 *  scene's internal animation begins, as a fraction of the enter transition:
 *    together  0%   content and container move as one (the old behaviour; fine for fast Z pops
 *                   and for surfaces that ARE the motion, like the logo animation)
 *    ride      60%  the reference's number — the container is mostly home, the content joins
 *                   while it still moves; reads as one continuous gesture
 *    after     100% content waits for the container — TWO motions with dead air between them;
 *                   measured in the reference as a 0.35s gap plus a detached pop. Deliberate
 *                   two-beat staging only.
 *  A token, never a number: the fraction multiplies the intro's MEASURED frames in prepare(). */
export const ENTRY = {together: 0, ride: 0.6, after: 1} as const;
export type EntryTok = keyof typeof ENTRY;

export const DEFAULTS = {enter: 'glide-in' as IntroId, exit: 'push-off-left' as OutroId, hold: 'normal' as HoldTok, size: 'lg' as SizeTok, entry: 'together' as EntryTok};

export const normalize = (raw: PromoDocRaw): PromoDoc => ({
  v: 1,
  id: raw.id,
  theme: raw.theme ?? 'soft-light',
  font: raw.font ?? 'inter',
  ...(raw.grid ? {grid: raw.grid} : {}),
  // Clamped HERE so the editor's live preview and the CLI render land on identical values — the
  // clampFraming pattern. A hand-edited nudge of 9999 renders as 500, it does not render as 9999.
  sound: {
    sfx: raw.sound?.sfx ?? 'on',
    ...(raw.sound?.music ? {music: raw.sound.music} : {}),
    cues: Object.fromEntries(
      Object.entries(raw.sound?.cues ?? {}).map(([k, v]) => [k, {...v, nudge: clampNudge(v?.nudge)}])
    ),
    // `at` quantised to 1ms and floored at 0 here; the upper bound is the scene's DERIVED length,
    // which normalize() cannot know — cues() clamps the resulting frame into the scene instead.
    custom: (raw.sound?.custom ?? []).map((c) => ({
      ...c,
      at: Number.isFinite(c.at) ? Math.max(0, Math.round(c.at)) : 0,
    })),
  },
  scenes: (raw.scenes ?? []).map((s) => {
    const base = {id: s.id, enter: s.enter ?? DEFAULTS.enter, exit: s.exit ?? DEFAULTS.exit, hold: s.hold ?? DEFAULTS.hold, entry: s.entry ?? DEFAULTS.entry};
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
  if (doc.font !== 'inter' && doc.font !== 'hf') errs.push(`unknown font token "${doc.font}"`);
  if (n < 1 || n > 14) errs.push(`a promo needs 1–14 scenes, got ${n}`); // 12 -> 14: the hf-blog-editor promo grew a thumbnail beat

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

  // Sound: tokens must be known, and a src must stay inside the two asset roots. The path rule is
  // not decoration — a doc is user-editable and gets handed to staticFile(), so "../../secret"
  // must not be expressible.
  for (const [id, o] of Object.entries(doc.sound?.cues ?? {})) {
    if (o?.gain && !(o.gain in GAIN)) errs.push(`sound cue "${id}": unknown gain token "${o.gain}"`);
    if (o?.src && !/^(sfx|music)\/[\w.-]+(\/[\w.-]+)*$/.test(o.src)) {
      errs.push(`sound cue "${id}": src "${o.src}" must be a simple path under sfx/ or music/`);
    }
  }
  if (doc.grid) {
    const {bpm} = doc.grid;
    if (!Number.isFinite(bpm) || bpm <= 0) errs.push(`grid.bpm must be a positive number, got ${bpm}`);
    else if ((FPS * 60) % bpm !== 0) {
      errs.push(
        `grid.bpm ${bpm} does not divide the frame rate: a beat would be ${((FPS * 60) / bpm).toFixed(2)} frames. ` +
          `Use a BPM where ${FPS * 60}/bpm is whole — 90, 100, 120, 144, 150, 180 (see the ON-BEAT law).`
      );
    }
  }
  for (const sc of doc.scenes) {
    if (!(sc.entry in ENTRY)) errs.push(`scene "${sc.id}": unknown entry token "${sc.entry}" (together | ride | after)`);
  }
  const sceneIds = new Set(doc.scenes.map((s) => s.id));
  const customIds = new Set<string>();
  for (const c of doc.sound?.custom ?? []) {
    if (customIds.has(c.id)) errs.push(`sound custom cue "${c.id}": duplicate id`);
    customIds.add(c.id);
    if (!sceneIds.has(c.scene)) errs.push(`sound custom cue "${c.id}": unknown scene "${c.scene}"`);
    if (c.gain && !(c.gain in GAIN)) errs.push(`sound custom cue "${c.id}": unknown gain token "${c.gain}"`);
    if (c.src && !/^(sfx|music)\/[\w.-]+(\/[\w.-]+)*$/.test(c.src)) {
      errs.push(`sound custom cue "${c.id}": src "${c.src}" must be a simple path under sfx/ or music/`);
    }
  }
  const music = doc.sound?.music;
  if (music) {
    if (music.level && !(music.level in MUSIC_LEVEL)) errs.push(`sound: unknown music level "${music.level}"`);
    if (music.fade && music.fade !== 'auto' && music.fade !== 'none') {
      errs.push(`sound: music fade must be "auto" or "none", got "${music.fade}"`);
    }
    if (!/^music\/[\w.-]+(\/[\w.-]+)*$/.test(music.src)) {
      errs.push(`sound: music src "${music.src}" must be a simple path under music/`);
    }
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
