import {Easing, interpolate} from 'remotion';

// Curves measured from the three studied references.
export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // expo.out — soft confident settle
  outStrong: Easing.bezier(0.22, 1, 0.36, 1),
  outQuart: Easing.bezier(0.165, 0.84, 0.44, 1), // [A]'s workhorse
  inOut: Easing.bezier(0.76, 0, 0.24, 1),
  in: Easing.bezier(0.5, 0, 0.75, 0),
  back: Easing.bezier(0.34, 1.4, 0.5, 1),
};

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
