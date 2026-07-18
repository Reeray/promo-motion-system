import React from 'react';
import {AbsoluteFill, interpolateColors, spring, useCurrentFrame, useVideoConfig} from 'remotion';

/* Polished text-animation samples, crafted in the animate-text idiom (clean centered
   sans, calm premium reveals) with the measured GPT-5.5 grammar (ease-out settle, no
   overshoot). Smoothness comes from spring() organic settles (near-critically damped)
   and continuous, overlapping reveal windows — never hard threshold switches. */

const SANS = "'Inter','Segoe UI',Arial,sans-serif";
const INK = '#14161c';
const ACCENT = '#2f6fed';
const WHITE: React.CSSProperties = {backgroundColor: '#fff'};

/* blur-resolve — a headline resolves from a soft, slightly-enlarged blur into sharp
   focus; each word springs in near-critically damped (no overshoot), a few frames
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

/* word-cascade — words rise and de-blur in a staggered spring cascade; the motion stays
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
