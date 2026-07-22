import {TEXT_EFFECT_IDS} from '../blocks/animate-text';
import {SURFACES} from './surfaces';

/* ============================================================================
 * PROMODOC — a promo as data.
 *
 * THE STANDING RULE: this document contains NO NUMBERS. Copy strings, block ids and
 * size/hold tokens, and nothing else. There is no field for a frame, a millisecond, an
 * easing, a colour or a font size — so the locked-motion law holds because motion is
 * UNREPRESENTABLE here, not because a rule asks nicely.
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
type BaseRaw = {id: string; enter?: IntroId; exit?: OutroId; hold?: HoldTok};
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
export type TextScene = Base & {kind: 'text'; effect: string; copy: string; sub: string | null; size: SizeTok};
export type UiScene = Base & {kind: 'ui'; surface: string};
export type Scene = TextScene | UiScene;
export type PromoDoc = {v: 1; id: string; theme: Theme; scenes: Scene[]};

export const DEFAULTS = {enter: 'glide-in' as IntroId, exit: 'push-off-left' as OutroId, hold: 'normal' as HoldTok, size: 'lg' as SizeTok};

export const normalize = (raw: PromoDocRaw): PromoDoc => ({
  v: 1,
  id: raw.id,
  theme: raw.theme ?? 'soft-light',
  scenes: (raw.scenes ?? []).map((s) => {
    const base = {id: s.id, enter: s.enter ?? DEFAULTS.enter, exit: s.exit ?? DEFAULTS.exit, hold: s.hold ?? DEFAULTS.hold};
    return s.kind === 'ui'
      ? ({...base, kind: 'ui', surface: s.surface} as UiScene)
      : ({...base, kind: 'text', effect: s.effect, copy: s.copy, sub: s.sub ?? null, size: s.size ?? DEFAULTS.size} as TextScene);
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
    } else if (!SURFACES[s.surface]) {
      errs.push(`scene "${s.id}": unknown surface "${s.surface}"`);
    }
    if (!(s.hold in HOLD)) errs.push(`scene "${s.id}": unknown hold token "${s.hold}"`);
  }
  return errs;
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
