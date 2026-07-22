import {Easing, interpolate} from 'remotion';

// Curves measured from the three studied references (frame-by-frame, diff-to-final fits).
export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // expo.out — soft confident settle
  outStrong: Easing.bezier(0.22, 1, 0.36, 1),
  outQuart: Easing.bezier(0.165, 0.84, 0.44, 1), // [A]'s workhorse
  inOut: Easing.bezier(0.76, 0, 0.24, 1),
  in: Easing.bezier(0.5, 0, 0.75, 0),
  back: Easing.bezier(0.34, 1.4, 0.5, 1),
  // [C] GPT-5.5 medium-tier, MEASURED:
  uiEnter: Easing.bezier(0.25, 0.46, 0.45, 0.94), // easeOutQuad — component fade+enter (rmse .02)
  uiEnterSoft: Easing.bezier(0.61, 1, 0.88, 1), // easeOutSine — larger result surfaces
  camera: Easing.bezier(0.2, 0.9, 0.25, 1), // macro push: strong ease-out, settles into hold
  move: Easing.bezier(0.4, 0, 0.2, 1), // material-standard — symmetric on-screen moves
  // Surface SCALE-IN on enter — measured ~0.90→1.0 (+~9%) + translate, ease-out, NO overshoot.
  // Use EASE.out / EASE.camera for the scale; this is the calm settle, not a bouncy pop.
  // Pre-cut PUSH — measured: outgoing surface scales up with an ACCELERATING (ease-in) ramp
  // that runs straight into a hard cut (composer & exec-summary both do this).
  preCut: Easing.bezier(0.5, 0, 1, 0.5), // easeIn accelerate — push into a hard cut
  // SHORT-THROW EXIT — measured @13.45–13.583s: the outgoing surface accelerates through a
  // tiny displacement (~30px on a 1920 frame = ~1.5% of frame width) and is HARD-CUT at peak
  // velocity while still fully on screen. ≈easeInQuad with a terminal surge. Never animate the
  // element all the way off-frame: the eye extrapolates the motion, so the cut reads as a throw.
  throwOut: Easing.bezier(0.45, 0.02, 0.85, 0.25),
};

/** Convert a measured duration in milliseconds to frames at the composition's own fps.
 *
 * Every timing in this system was measured in ms from the reference films, then hardcoded as a
 * frame count for 60fps. That silently bakes a framerate into the motion: the same block rendered
 * at 30fps would run twice as long in wall-clock time. Derive from `useVideoConfig().fps` instead
 * so a block keeps its measured *duration* whatever the composition's framerate is. */
export const msToFrames = (ms: number, fps: number) => Math.round((ms / 1000) * fps);

export const lerp = (
  frame: number,
  range: [number, number],
  out: [number, number],
  easing: (n: number) => number = EASE.out
) =>
  interpolate(frame, range, out, {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

// Quantized step interpolation — [B]'s pixel-native motion (no easing, discrete ticks).
export const qstep = (frame: number, range: [number, number], steps: number) => {
  const t = Math.min(1, Math.max(0, (frame - range[0]) / (range[1] - range[0])));
  return Math.floor(t * steps) / steps;
};

// Deterministic pseudo-random (Date.now/Math.random are unstable across renders).
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
