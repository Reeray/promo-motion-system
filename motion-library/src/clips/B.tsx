import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {EASE, lerp, qstep, rand} from '../lib/ease';
import {FONT} from '../lib/palette';

const CREAM: React.CSSProperties = {backgroundColor: '#faf3ed', fontFamily: FONT.sans};
const PIX = 26; // pixel quantum
// jurni-like pixel glyph on a 5×5 grid (1 = filled)
const GLYPH = [
  [0, 1, 1, 0, 0],
  [1, 0, 1, 1, 0],
  [1, 1, 0, 1, 1],
  [1, 0, 1, 1, 0],
  [0, 1, 1, 0, 0],
];
const PALETTE = ['#e0532f', '#ef8b45', '#d24fa0', '#7a5df0', '#4f7df0'];

/* B5 — dot-birth + palette-flood: a lone dot holds (anticipation), pixels fly in and
   snap to grid in a 0.35s burst, then brand color floods cluster-by-cluster. */
export const DotBirth: React.FC = () => {
  const f = useCurrentFrame();
  const cells: {r: number; c: number; i: number}[] = [];
  GLYPH.forEach((row, r) => row.forEach((v, c) => v && cells.push({r, c, i: cells.length})));
  const cx = 640;
  const cy = 330;
  const floodP = lerp(f, [46, 68], [0, 1], (t) => t);
  return (
    <AbsoluteFill style={{...CREAM}}>
      {cells.map(({r, c, i}) => {
        const isSeed = r === 2 && c === 2;
        const start = 28 + (i % 7);
        const p = isSeed ? 1 : lerp(f, [start, start + 9], [0, 1], EASE.outStrong);
        const ox = (rand(i * 3 + 1) - 0.5) * 360;
        const oy = (rand(i * 5 + 2) - 0.5) * 280;
        const colored = floodP * cells.length > i;
        if (!isSeed && f < start) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: cx + (c - 2) * PIX + ox * (1 - p),
              top: cy + (r - 2) * PIX + oy * (1 - p),
              width: PIX - 2,
              height: PIX - 2,
              background: colored ? PALETTE[i % PALETTE.length] : '#141414',
              opacity: isSeed ? 1 : p,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* B6 — quantum-bars: stepped gradient columns rise like an equalizer — deliberately
   quantized, no easing (the mark's pixel physics applied to the environment). */
export const QuantumBars: React.FC = () => {
  const f = useCurrentFrame();
  const n = 14;
  return (
    <AbsoluteFill style={{...CREAM, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4}}>
      {Array.from({length: n}, (_, i) => {
        const target = 180 + rand(i + 9) * 380 + Math.sin((i / n) * Math.PI) * 160;
        const p = qstep(f, [6 + (i % 5) * 3, 48 + (i % 5) * 3], 9);
        const h = Math.round((target * p) / PIX) * PIX;
        return (
          <div
            key={i}
            style={{
              width: 62,
              height: h,
              background: 'linear-gradient(180deg,#7a5df0 0%,#d24fa0 45%,#ef8b45 100%)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* B7 — swallow-morph: the status pill collapses width around its glyph and becomes the
   app icon; text fades as the container swallows it. */
export const SwallowMorph: React.FC = () => {
  const f = useCurrentFrame();
  const dots = '.'.repeat((Math.floor(f / 9) % 3) + 1);
  const m = lerp(f, [30, 43], [0, 1], EASE.inOut);
  const w = 340 - m * 272; // 340 → 68
  const drift = lerp(f, [43, 75], [0, 1], (t) => t);
  return (
    <AbsoluteFill style={{...CREAM, justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          width: w,
          height: 68,
          borderRadius: 20,
          background: '#101014',
          boxShadow: '0 14px 44px rgba(224,83,47,.35), 0 6px 30px rgba(122,93,240,.25)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 18,
          overflow: 'hidden',
          transform: `translate(${-drift * 60}px, ${drift * 40}px)`,
        }}
      >
        <div style={{width: 26, height: 26, flexShrink: 0, borderRadius: 6, background: '#e75f8e'}} />
        <span
          style={{
            marginLeft: 14,
            fontSize: 25,
            fontWeight: 600,
            color: '#c9a6f2',
            whiteSpace: 'nowrap',
            opacity: 1 - lerp(f, [30, 37], [0, 1], (t) => t),
          }}
        >
          Jurni is Thinking{dots}
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* B8 — hover-ignite: the cursor arrives and the button lights with a full gradient
   bloom — a material change, sustained while hovered; click dips, then release. */
export const HoverIgnite: React.FC = () => {
  const f = useCurrentFrame();
  const cx = lerp(f, [4, 26], [980, 700], EASE.out);
  const cy = lerp(f, [4, 26], [600, 400], EASE.out);
  const lit = lerp(f, [26, 40], [0, 1], (t) => t) * (f < 56 ? 1 : lerp(f, [56, 64], [1, 0]));
  const press = f >= 52 && f < 58 ? 0.94 : 1;
  return (
    <AbsoluteFill style={{background: 'linear-gradient(160deg,#f6d9c8,#eda282)', fontFamily: FONT.sans, justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          position: 'relative',
          width: 84,
          height: 84,
          borderRadius: 24,
          background: '#232327',
          transform: `scale(${press})`,
          boxShadow: `0 10px 30px rgba(40,20,10,.25), 0 0 ${lit * 46}px rgba(255,110,180,${lit * 0.75})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg,#ffd7ec 0%,#ff8fc4 55%,#e75f8e 100%)',
            opacity: lit,
          }}
        />
        {/* CSS chevron-up arrow (text glyphs are unreliable in the headless renderer) */}
        <div
          style={{
            position: 'relative',
            width: 22,
            height: 22,
            borderLeft: `6px solid ${lit > 0.5 ? '#8a1c4d' : '#ff9fce'}`,
            borderTop: `6px solid ${lit > 0.5 ? '#8a1c4d' : '#ff9fce'}`,
            transform: 'rotate(45deg) translateY(4px)',
            borderRadius: 3,
          }}
        />
      </div>
      {/* cursor */}
      <div
        style={{
          position: 'absolute',
          left: cx,
          top: cy,
          width: 0,
          height: 0,
          borderLeft: '16px solid #111',
          borderRight: '7px solid transparent',
          borderBottom: '24px solid transparent',
          transform: 'rotate(-12deg)',
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))',
        }}
      />
    </AbsoluteFill>
  );
};

/* B9 — headline-swap: the title rewrites itself word-by-word in place — incoming words
   arrive accent-colored and settle to ink while the scene holds. */
export const HeadlineSwap: React.FC = () => {
  const f = useCurrentFrame();
  const oldW = ['One', 'Agentic', 'Engine'];
  const newW = ['Every', 'Shopping', 'Journey'];
  const starts = [22, 32, 42];
  return (
    <AbsoluteFill style={{background: 'linear-gradient(150deg,#ded9f5,#f5dbe4,#f7e5d5)', fontFamily: FONT.sans, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{display: 'flex', gap: 24, fontSize: 54, fontWeight: 700, letterSpacing: -1}}>
        {oldW.map((w, i) => {
          const s = starts[i];
          const outP = lerp(f, [s, s + 7], [0, 1], EASE.in);
          const inP = lerp(f, [s + 5, s + 14], [0, 1], EASE.outQuart);
          const settle = lerp(f, [s + 14, s + 26], [0, 1], (t) => t);
          const color = settle > 0.5 ? '#161619' : '#e0532f';
          const slotW = [180, 260, 230][i]; // fits the wider of old/new word
          return (
            <span key={w} style={{position: 'relative', display: 'inline-block', width: slotW, textAlign: 'center'}}>
              <span
                style={{
                  color: '#161619',
                  opacity: 1 - outP,
                  filter: `blur(${outP * 6}px)`,
                  display: 'inline-block',
                  transform: `translateY(${-outP * 16}px)`,
                }}
              >
                {w}
              </span>
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  color,
                  opacity: inP,
                  filter: `blur(${(1 - inP) * 6}px)`,
                  display: 'inline-block',
                  transform: `translateY(${(1 - inP) * 18}px)`,
                  whiteSpace: 'nowrap',
                }}
              >
                {newW[i]}
              </span>
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
