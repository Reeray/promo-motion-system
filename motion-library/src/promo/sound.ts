import {INTRO, OUTRO, PromoDoc, Scene} from './schema';
import {SURFACES} from './surfaces';
import {CueKind, GAIN, GainTok} from './sound-kinds';

/* ============================================================================
 * THE CUE LIST — derived, never authored.
 *
 * A cue's frame comes from the SAME anchors prepare() already computed for the picture: a scene's
 * start, the frame its intro lands, the frame its outro fires. Nothing here invents a time, which
 * is what makes "on-point" a property of the system rather than of somebody's patience.
 *
 * WHY THIS IS A PURE FUNCTION OF `Prepared`, IN ITS OWN FILE:
 *   - it must be callable from Node, so the gates can reason about cues without a browser
 *   - it must be the ONLY place the derivation exists (static rule R6), so the editor's dots and
 *     the render's audio cannot drift apart — they read one list
 *   - it must never be reachable from sceneFrames(), which is what gate P6 proves: strip every
 *     `sound` block and every surface cue array, re-prepare, and not one frame may move
 *
 * `len` matters more than it looks. A cue Sequence with no explicit duration inherits Remotion's
 * `durationInFrames = Infinity`, so it mounts at its frame and NEVER unmounts — mounts accumulate
 * across the whole composition and Remotion throws hard past `numberOfSharedAudioTags`. So every
 * cue carries its length, taken from the same measured ms constants the generator used.
 * ========================================================================== */

export type Cue = {
  /** Stable across copy edits, so an authored nudge survives re-typing the words. */
  id: string;
  kind: CueKind;
  /** Absolute frame in the composition. */
  frame: number;
  /** Length in frames — REQUIRED, see the header. */
  len: number;
  /**
   * The audio to play, or NULL for an empty slot.
   *
   * This system derives WHEN a sound should happen; it does not supply the sound. A cue with no
   * src is a fully-formed placeholder — it has a precise time, a length, an id and a dot in the
   * editor — that simply makes no noise until someone drops a file on it. That is the normal
   * state of a new promo, not an error.
   *
   * Deliberately NOT resolved by filename convention (`sfx/<kind>.wav`): the renderer runs in a
   * browser and cannot check whether a file exists, and Remotion fetches every asset up front and
   * dies on a 404. So the doc names exactly what will play, and gate A4 can check it.
   */
  src: string | null;
  gain: number;
};

/**
 * How long a slot IS, which is not the same as how long the file a user drops into it is.
 *
 * The four transition kinds are exactly their transition's measured duration — that is the SOUND
 * FOLLOWS MOTION law, and `cueLengthDrift()` below checks it rather than trusting it. The three ui
 * lengths are chosen, not measured, and are marked as such.
 *
 * What this length does: it bounds the cue's <Sequence>, so a long file is trimmed to the gesture
 * it belongs to rather than running over the next one, and it is what the overlap budget counts.
 * A shorter file simply finishes early.
 */
const CUE_MS: Record<CueKind, number> = {
  'push-off-left': 150,
  'scale-up-cut': 100,
  'glide-in': 900,
  'scale-pop-in': 430,
  'ui-tick': 60,
  'ui-swap': 180,
  'ui-rise': 90,
};

const framesFor = (kind: CueKind, fps: number) => Math.ceil((CUE_MS[kind] / 1000) * fps);

/**
 * The four transition cues claim to be exactly as long as their transitions. This checks it
 * instead of asserting it in a comment — if someone re-measures a transition and edits
 * transitions.tsx, the sound is now wrong and this reports it by name.
 * Returns [] when consistent.
 */
export const cueLengthDrift = (fps: number): string[] => {
  const out: string[] = [];
  const pairs: [CueKind, number][] = [
    ['push-off-left', OUTRO['push-off-left'].frames],
    ['scale-up-cut', OUTRO['scale-up-cut'].frames],
    ['glide-in', INTRO['glide-in'].frames],
    ['scale-pop-in', INTRO['scale-pop-in'].frames],
  ];
  for (const [kind, motionFrames] of pairs) {
    const soundFrames = framesFor(kind, fps);
    if (soundFrames !== motionFrames) {
      out.push(
        `cue "${kind}" is ${soundFrames}f but its transition is ${motionFrames}f — SOUND FOLLOWS ` +
          `MOTION requires them equal. Re-run \`npm run sfx\` after changing transitions.tsx, and ` +
          `update CUE_MS in src/promo/sound.ts.`
      );
    }
  }
  return out;
};

type PreparedLike = {
  doc: PromoDoc;
  scenes: {scene: Scene; frames: number; start: number}[];
  fps: number;
};

/**
 * The frame a scene's outro fires — the instant the object is thrown.
 *
 * Exported because the editor needs it too (clicking a junction seeks here), and two independent
 * copies of this expression would eventually disagree: the dot would sit at one frame and the
 * playhead jump to another. Gate R6 forbids recomputing it anywhere else.
 */
export const outroFrame = (p: {frames: number; start: number; scene: Scene}): number =>
  p.start + p.frames - OUTRO[p.scene.exit].frames;

const clampNudgeFrames = (nudgeMs: number, fps: number) => Math.round((nudgeMs / 1000) * fps);

/**
 * Every cue in a promo, in frame order.
 *
 * Transition cues fire where the motion does: an outro at the frame it is thrown, an intro at the
 * frame it begins arriving. UI cues come from the surface's own published list, offset by where
 * that surface sits in the timeline.
 */
export const cues = (prep: PreparedLike): Cue[] => {
  const {doc, scenes, fps} = prep;
  if (doc.sound?.sfx === 'off') return [];

  const overrides = doc.sound?.cues ?? {};
  const out: Cue[] = [];

  const push = (id: string, kind: CueKind, frame: number) => {
    const o = overrides[id];
    const nudged = frame + (o?.nudge ? clampNudgeFrames(o.nudge, fps) : 0);
    out.push({
      id,
      kind,
      frame: Math.max(0, nudged),
      len: framesFor(kind, fps),
      src: o?.src ?? null, // empty slot until someone fills it — see the Cue type
      gain: GAIN[(o?.gain ?? 'normal') as GainTok] ?? 1,
    });
  };

  scenes.forEach((p, i) => {
    const s = p.scene;

    // The intro: it begins at the scene's first frame, so the sound starts with the movement.
    // Scene 0 is excluded — nothing is handing off INTO the first shot, so an arrival sound there
    // would announce a transition the viewer never saw.
    if (i > 0) push(`${s.id}:${s.enter}:in`, s.enter as CueKind, p.start);

    // The outro: fires where the throw starts, which prepare() already located.
    if (i < scenes.length - 1) push(`${s.id}:${s.exit}:out`, s.exit as CueKind, outroFrame(p));

    // UI cues, published by the surface, rebased onto the timeline.
    if (s.kind === 'ui') {
      const surf = SURFACES[s.surface];
      (surf?.cues ?? []).forEach((c, n) => push(`${s.id}:${c.kind}:${n}`, c.kind, p.start + c.at));
    }
  });

  return out.sort((a, b) => a.frame - b.frame);
};

/**
 * The most cues alive at any instant, counted by INTERVAL OVERLAP rather than by exact-frame
 * collision.
 *
 * Counting collisions would be near-vacuous: two cues one frame apart never share a frame, yet
 * both hold an audio tag and both sum into the mix. Overlap is what the two budgets actually care
 * about, and they are different quantities:
 *   MIX_BUDGET  headroom — how many can sum before clipping (T26 measured 4 at -15 dBFS)
 *   TAG_BUDGET  mount concurrency — Remotion THROWS past numberOfSharedAudioTags
 * `+1` accounts for the music bed, which is mounted for the entire composition.
 */
export const maxSimultaneous = (list: Cue[], hasMusic: boolean): number => {
  const edges = list.flatMap((c) => [{at: c.frame, d: 1}, {at: c.frame + c.len, d: -1}]);
  edges.sort((a, b) => a.at - b.at || a.d - b.d); // close before open at the same frame
  let cur = 0;
  let peak = 0;
  for (const e of edges) {
    cur += e.d;
    if (cur > peak) peak = cur;
  }
  return peak + (hasMusic ? 1 : 0);
};

/** Budgets, both derived in T26 and recorded in PLAN.md with their arithmetic. */
export const MIX_BUDGET = 4;
export const TAG_BUDGET = 8;
