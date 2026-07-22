import {ANIMATE_TEXT_EFFECTS} from '../blocks/animate-text';
import {countUnits, timeline} from '../blocks/animate-text/SpecText';
import {SURFACES} from './surfaces';
import {
  FPS, HEIGHT, HOLD, INTRO, MIN_SETTLE, OUTRO, PromoDoc, PromoDocRaw, Scene, WIDTH,
  axisWarnings, framingWarnings, normalize, validate,
} from './schema';

/* ============================================================================
 * THE ONLY PLACE DURATION IS COMPUTED.
 *
 * Nothing else may derive a scene length. `Composition.calculateMetadata` and the editor's
 * `<Player>` both consume this function's OUTPUT — neither ever receives a raw doc.
 *
 * Why that rule is load-bearing: @remotion/player does NOT run calculateMetadata; it takes
 * durationInFrames as a plain prop. The hand-written promos got parity for free because both
 * call sites imported the same CONSTANT, which cannot diverge. A shared FUNCTION called at two
 * sites can. So there is exactly one call, and its result is passed around whole.
 * ========================================================================== */

const SPEC = new Map(ANIMATE_TEXT_EFFECTS.map((e) => [e.id, e.spec]));

/** Soft/hard bounds. Copy length drives per-unit stagger, so a long string on a per-character
 *  effect balloons: ~120 characters on bottom-up-letters derives to roughly 500 frames for one
 *  line of text. Better to refuse than to render an eight-second title nobody asked for. */
export const SCENE_WARN = 240;
export const SCENE_MAX = 480;
export const TOTAL_MAX = 1200; // 20s — this system exists for quick, simple promos

/** Body length of a scene, before its intro floor and outro are applied. */
const bodyFrames = (s: Scene): number => {
  if (s.kind === 'ui') return SURFACES[s.surface]?.frames ?? 0;
  const spec = SPEC.get(s.effect);
  if (!spec) return 0;
  const units = countUnits(s.copy, spec.target);
  // exitTotal and RT.gap are excluded on purpose: promos render with loop={false}, so the
  // surrounding transition owns the exit. Including them would double-count the handoff.
  const ms = timeline(spec, units).enterTotal + HOLD[s.hold];
  return Math.ceil((ms / 1000) * FPS);
};

/** Full scene length: body, floored so the intro can land, plus the outro.
 *
 * THE FLOOR IS MEASURED, NOT PADDING. `glide-in` needs 54 frames to settle, while the shortest
 * text scenes derive to about 60 total — so a 9-frame throw would begin roughly 3 frames BEFORE
 * the incoming object came to rest, inverting the "short throw, cut at peak" law. */
export const sceneFrames = (s: Scene): number =>
  Math.max(bodyFrames(s), INTRO[s.enter].frames + MIN_SETTLE) + OUTRO[s.exit].frames;

export type PreparedScene = {scene: Scene; frames: number; start: number};
export type Prepared = {
  doc: PromoDoc;
  scenes: PreparedScene[];
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  warnings: string[];
};

export const prepare = (raw: PromoDocRaw): Prepared => {
  const doc = normalize(raw);
  const errs = validate(doc);
  if (errs.length) throw new Error(`Invalid promo doc "${raw?.id ?? '?'}":\n  - ${errs.join('\n  - ')}`);

  let start = 0;
  const scenes: PreparedScene[] = doc.scenes.map((scene) => {
    const frames = sceneFrames(scene);
    const p = {scene, frames, start};
    start += frames;
    return p;
  });

  // The per-scene bounds exist to catch COPY-DRIVEN balloon — per-unit stagger multiplied by a
  // long string. A ui surface's length is its own measured choreography (the storage surface is a
  // legitimate 7.6s), so bounding it would be second-guessing a captured artifact.
  const over = scenes.filter((p) => p.scene.kind === 'text' && p.frames > SCENE_MAX);
  if (over.length) {
    throw new Error(
      `Invalid promo doc "${doc.id}": scene(s) exceed ${SCENE_MAX} frames — ` +
        over.map((p) => `"${p.scene.id}" at ${p.frames}f`).join(', ') +
        `. Copy length drives per-unit stagger; shorten the copy or pick a less staggered effect.`
    );
  }
  if (start > TOTAL_MAX) {
    throw new Error(`Invalid promo doc "${doc.id}": total ${start}f exceeds ${TOTAL_MAX}f (${(TOTAL_MAX / FPS).toFixed(0)}s).`);
  }

  const warnings = [
    ...axisWarnings(doc),
    ...framingWarnings(doc),
    ...scenes
      .filter((p) => p.scene.kind === 'text' && p.frames > SCENE_WARN)
      .map((p) => `scene "${p.scene.id}" is ${(p.frames / FPS).toFixed(1)}s — long for a quick promo.`),
  ];

  // `start` has accumulated the sum of every scene, so the composition length and the sum of the
  // Series.Sequence lengths are equal BY CONSTRUCTION rather than by two agreeing calculations.
  return {doc, scenes, durationInFrames: start, fps: FPS, width: WIDTH, height: HEIGHT, warnings};
};
