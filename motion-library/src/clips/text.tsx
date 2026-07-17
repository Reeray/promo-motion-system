import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {EASE} from '../lib/ease';

/* Polished text-animation samples, crafted in the animate-text idiom (clean centered
   sans, calm premium reveals) with the measured GPT-5.5 grammar (ease-out settle, no
   overshoot). Smoothness comes from: continuous sub-pixel motion, generous OVERLAPPING
   reveal windows, spring() for organic settles, interpolateColors() for accent→ink
   transitions, and velocity-scaled motion blur — never hard threshold switches. */

const SANS = "'Inter','Segoe UI',Arial,sans-serif";
const INK = '#14161c';
const ACCENT = '#2f6fed';
const TEAL = '#12b886';
const WHITE: React.CSSProperties = {backgroundColor: '#fff'};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
// smootherstep — C2-continuous (zero velocity AND acceleration at both ends): the key
// to reveals that never "snap" on or off.
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/* type-on + highlighter — each character eases in (fade + rise + de-blur) instead of
   hard-appearing; once the line lands, a marker highlight sweeps across the key word. */
export const TypeOnHighlighter: React.FC = () => {
  const f = useCurrentFrame();
  const words = ['Ship', 'faster', 'with', 'Prism.'];
  const targetIdx = 1; // "faster" gets the marker sweep
  const START = 6;
  const PER = 1.9; // frames per character — fast, but each char still eases in
  const totalChars = words.reduce((n, w) => n + w.length, 0) + (words.length - 1);
  const doneFrame = START + totalChars * PER;
  const sweep = interpolate(f, [doneFrame + 3, doneFrame + 17], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE.outQuart,
  });
  const sweepFade = interpolate(f, [doneFrame + 40, doneFrame + 60], [1, 0.42], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const caretOp = f < doneFrame + 8 ? 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(f / 3.2)) : 0;

  let gi = 0;
  return (
    <AbsoluteFill style={{...WHITE, justifyContent: 'center', alignItems: 'center', fontFamily: SANS}}>
      <div style={{fontSize: 66, fontWeight: 700, letterSpacing: -1.5, color: INK, display: 'flex', gap: '0.3em', alignItems: 'baseline'}}>
        {words.map((w, wi) => {
          const chars = [...w].map((ch) => {
            const cp = smooth((f - (START + gi * PER)) / 5);
            gi++;
            return (
              <span key={gi} style={{display: 'inline-block', opacity: cp, transform: `translateY(${(1 - cp) * 11}px)`, filter: `blur(${(1 - cp) * 3}px)`}}>
                {ch}
              </span>
            );
          });
          gi++; // the inter-word space
          return (
            <span key={wi} style={{position: 'relative', display: 'inline-block'}}>
              {wi === targetIdx && (
                <span
                  style={{
                    position: 'absolute',
                    left: -3,
                    right: -3,
                    bottom: 7,
                    height: 24,
                    background: 'rgba(47,111,237,.22)',
                    borderRadius: 6,
                    transformOrigin: 'left center',
                    transform: `scaleX(${sweep})`,
                    opacity: sweepFade,
                    zIndex: 0,
                  }}
                />
              )}
              <span style={{position: 'relative', zIndex: 1}}>{chars}</span>
            </span>
          );
        })}
        <span style={{display: 'inline-block', width: 3, height: 50, background: ACCENT, borderRadius: 2, opacity: caretOp}} />
      </div>
    </AbsoluteFill>
  );
};

/* comet-paint — a shooting-star streak crosses the line with eased velocity; each word
   is "painted" as the head passes: accent→ink color interpolation, blur→sharp, and a
   brief glow, all over a generous overlapping window so the paint is continuous. */
export const CometPaint: React.FC = () => {
  const f = useCurrentFrame();
  const words = ['Every', 'model.', 'Everywhere.'];
  const cx = [250, 520, 800];
  const baselineY = 330;
  const MOTION = Easing.bezier(0.45, 0, 0.55, 1); // smooth ease-in-out sweep
  const headAt = (frame: number) =>
    interpolate(frame, [2, 54], [-240, 1520], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: MOTION});
  const headX = headAt(f);
  const vel = Math.abs(headX - headAt(f - 1)); // px/frame → motion-blur length
  const streakLen = 70 + vel * 6.5;
  const headY = baselineY + 30 + Math.sin(f / 7) * 9; // gentle continuous drift
  const cometFade = interpolate(f, [0, 6, 50, 60], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{...WHITE, fontFamily: SANS, overflow: 'hidden'}}>
      <div style={{position: 'absolute', top: baselineY, left: 0, right: 0}}>
        {words.map((w, i) => {
          const wp = smooth((headX - (cx[i] - 30)) / 210); // paints as the head crosses
          const paintGlow = clamp01((headX - (cx[i] - 30)) / 110) * (1 - wp);
          const col = interpolateColors(clamp01(wp * 1.25), [0, 1], [TEAL, INK]);
          return (
            <span
              key={w}
              style={{
                position: 'absolute',
                left: cx[i],
                top: 0,
                fontSize: 60,
                fontWeight: 700,
                letterSpacing: -1.5,
                color: col,
                opacity: wp,
                filter: `blur(${(1 - wp) * 13}px)`,
                transform: `translateY(${(1 - wp) * 15}px) scale(${0.95 + wp * 0.05})`,
                textShadow: `0 0 ${paintGlow * 28}px rgba(18,184,134,${paintGlow * 0.85})`,
                whiteSpace: 'nowrap',
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      <div style={{position: 'absolute', inset: 0, opacity: cometFade}}>
        <div
          style={{
            position: 'absolute',
            left: headX - streakLen,
            top: headY - 3,
            width: streakLen,
            height: 6,
            background: 'linear-gradient(90deg, rgba(47,184,255,0) 0%, rgba(47,184,255,.45) 55%, rgba(150,230,255,.95) 100%)',
            filter: 'blur(2px)',
            borderRadius: 3,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: headX - 9,
            top: headY - 9,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #eafcff 0%, #48c6ff 55%, rgba(47,150,255,0) 76%)',
            boxShadow: '0 0 24px 7px rgba(60,180,255,.65)',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* blur-resolve — a headline resolves from a soft, slightly-enlarged blur into sharp
   focus; each word springs in (near-critically damped, no overshoot) a few frames
   apart. The premium "focus pull" reveal. */
export const BlurResolve: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = ['A', 'sharper', 'kind', 'of', 'fast.'];
  return (
    <AbsoluteFill style={{...WHITE, justifyContent: 'center', alignItems: 'center', fontFamily: SANS}}>
      <div style={{display: 'flex', gap: 20, fontSize: 68, fontWeight: 700, letterSpacing: -2, color: INK}}>
        {words.map((w, i) => {
          const s = spring({frame: f - (8 + i * 3), fps, config: {damping: 26, stiffness: 120, mass: 1}});
          const last = i === words.length - 1;
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                opacity: s,
                filter: `blur(${(1 - s) * 18}px)`,
                transform: `scale(${1.09 - s * 0.09}) translateY(${(1 - s) * 6}px)`,
                color: last ? interpolateColors(s, [0, 1], [INK, ACCENT]) : INK,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* word-cascade — words rise and de-blur in a staggered spring cascade; the motion is
   continuous because each word's spring overlaps the next. */
export const WordCascade: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lines = [
    ['One', 'agent.'],
    ['Every', 'workflow.'],
  ];
  let idx = 0;
  return (
    <AbsoluteFill style={{background: 'linear-gradient(180deg,#ffffff,#eef1f6)', justifyContent: 'center', alignItems: 'center', fontFamily: SANS}}>
      <div style={{textAlign: 'center'}}>
        {lines.map((line, li) => (
          <div key={li} style={{display: 'flex', gap: 22, justifyContent: 'center', fontSize: 64, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.16}}>
            {line.map((w) => {
              const s = spring({frame: f - (6 + idx++ * 5), fps, config: {damping: 24, stiffness: 130, mass: 0.9}});
              const last = li === lines.length - 1 && w === line[line.length - 1];
              return (
                <span
                  key={w}
                  style={{
                    display: 'inline-block',
                    opacity: s,
                    transform: `translateY(${(1 - s) * 30}px)`,
                    filter: `blur(${(1 - s) * 5}px)`,
                    color: last ? ACCENT : INK,
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* gradient-sweep — the settled headline fades in, then an accent shimmer sweeps across
   it continuously (background-clip:text). A polish accent for a held title. */
export const GradientSweep: React.FC = () => {
  const f = useCurrentFrame();
  const appear = smooth((f - 4) / 12);
  const pos = ((f * 2.1) % 170) - 35; // -35% → 135%, loops
  return (
    <AbsoluteFill style={{...WHITE, justifyContent: 'center', alignItems: 'center', fontFamily: SANS}}>
      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: -2,
          opacity: appear,
          transform: `translateY(${(1 - appear) * 8}px)`,
          backgroundImage: `linear-gradient(100deg, ${INK} 0%, ${INK} ${pos - 12}%, ${ACCENT} ${pos}%, ${TEAL} ${pos + 7}%, ${INK} ${pos + 22}%, ${INK} 100%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Beautifully fast.
      </div>
    </AbsoluteFill>
  );
};
