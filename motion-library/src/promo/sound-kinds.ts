/* ============================================================================
 * CUE KINDS — the sound vocabulary, in its own file.
 *
 * Separate from sound.ts purely to break a cycle: surfaces/index.ts needs the KIND type to declare
 * its `cues` field, and sound.ts needs the SURFACES registry to resolve those cues into frames.
 * Types only, so nothing here can pull a renderer into a Node import.
 *
 * The four transition kinds are named after the transitions themselves, because that is the whole
 * law: a cue's length IS its transition's measured duration, so `push-off-left` the sound and
 * `push-off-left` the motion are one thing under two names. The three ui kinds have no such
 * anchor — their durations are INVENTED (see public/sfx/manifest.json) and labelled as much.
 * ========================================================================== */

export const CUE_KINDS = [
  'push-off-left',
  'scale-up-cut',
  'glide-in',
  'scale-pop-in',
  'ui-tick',
  'ui-swap',
  'ui-rise',
  /** A USER-ADDED slot, placed by clicking the + on the editor's cue rail. Unlike every other
   *  kind its instant is authored, not derived — anchored to a scene as a ms offset, so it
   *  travels with its scene when earlier scenes change length. */
  'custom',
] as const;

export type CueKind = (typeof CUE_KINDS)[number];

/** Loudness tokens, never numbers — the doc says how loud in words, prepare() resolves them.
 *  `normal` is the authored level (the -15 dBFS ceiling from T26); the others trim from it, and
 *  nothing may exceed it, or the headroom calibration stops holding. */
export const GAIN = {soft: 0.5, normal: 1, loud: 1} as const;
export type GainTok = keyof typeof GAIN;

/** Music bed level. Deliberately a separate, quieter scale from cue gain: a bed runs continuously
 *  under everything, so it is the one element whose level is about *not* competing. */
export const MUSIC_LEVEL = {soft: 0.18, normal: 0.3} as const;
export type MusicLevelTok = keyof typeof MUSIC_LEVEL;
