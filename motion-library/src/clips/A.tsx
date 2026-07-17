import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../lib/ease';

const WHITE: React.CSSProperties = {backgroundColor: '#fff'};

/* A1 — type-on + highlighter: chars type with a caret; a soft teal blob rides the
   newest words and fades ~0.6s after the line settles. */
export const TypeOnHighlighter: React.FC = () => {
  const f = useCurrentFrame();
  const text = 'Tired of switching tabs?';
  const done = 42;
  const n = Math.min(text.length, Math.floor(lerp(f, [6, done], [0, text.length], (t) => t)));
  const typed = text.slice(0, n);
  const blobOp = f < done ? 0.55 : lerp(f, [done + 6, done + 24], [0.55, 0]);
  const caretOn = Math.floor(f / 8) % 2 === 0;
  return (
    <AbsoluteFill style={{...WHITE, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{position: 'relative', fontSize: 56, fontWeight: 700, color: '#141419', letterSpacing: -1}}>
        <div
          style={{
            position: 'absolute',
            right: -30,
            top: -26,
            width: 260,
            height: 110,
            borderRadius: 60,
            background: 'radial-gradient(closest-side, rgba(54,211,153,.85), rgba(56,189,248,0))',
            filter: 'blur(14px)',
            opacity: blobOp,
          }}
        />
        <span style={{position: 'relative'}}>
          {typed}
          <span style={{opacity: caretOn && f < done + 12 ? 1 : 0, fontWeight: 400}}>|</span>
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* A2 — comet-paint: a comet crosses the line; each word appears accent-colored + blurred
   where it passes, then settles to sharp ink. */
export const CometPaint: React.FC = () => {
  const f = useCurrentFrame();
  const words = ['Every', 'model.', 'Everywhere.'];
  const xs = [270, 500, 800]; // word anchor x-positions
  const cometX = lerp(f, [4, 48], [140, 1150], EASE.inOut);
  const cometY = 360 + Math.sin(f / 5.5) * 26;
  return (
    <AbsoluteFill style={{...WHITE, justifyContent: 'center'}}>
      <div style={{position: 'absolute', top: 320, left: 0, right: 0, textAlign: 'left'}}>
        {words.map((w, i) => {
          const born = cometX > xs[i];
          const age = born ? lerp(cometX, [xs[i], xs[i] + 180], [0, 1], (t) => t) : 0;
          return (
            <span
              key={w}
              style={{
                position: 'absolute',
                left: xs[i],
                fontSize: 58,
                fontWeight: 700,
                letterSpacing: -1,
                color: age > 0.6 ? '#141419' : '#12b886',
                opacity: born ? Math.min(1, age * 2.5) : 0,
                filter: `blur(${Math.max(0, 7 - age * 10)}px)`,
                transition: 'none',
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      {/* comet + trail */}
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <div
          key={k}
          style={{
            position: 'absolute',
            left: cometX - k * 26,
            top: cometY - k * 5,
            width: 22 - k * 3,
            height: 22 - k * 3,
            borderRadius: '50%',
            background: '#2fb8ff',
            opacity: (f < 50 ? 0.95 : lerp(f, [50, 58], [0.95, 0])) * (1 - k * 0.16),
            filter: `blur(${1 + k * 2.4}px)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/* A3 — anchored-grow: a panel grows from behind the search bar (transform-origin at its
   anchor), blur→sharp, children staggering in 1–3 frames behind the container. */
export const AnchoredGrow: React.FC = () => {
  const f = useCurrentFrame();
  const g = lerp(f, [10, 26], [0, 1], EASE.outQuart);
  const rows = ['Grok 4.3', 'Opus 4.8', 'ChatGPT 5.5', 'Gemini 3.5'];
  return (
    <AbsoluteFill style={{background: 'linear-gradient(160deg,#dfe9f5,#c6d8ee)', justifyContent: 'flex-end', alignItems: 'center'}}>
      <div
        style={{
          marginBottom: 210,
          width: 560,
          padding: '18px 20px',
          borderRadius: 20,
          background: 'rgba(255,255,255,.55)',
          border: '1px solid rgba(255,255,255,.8)',
          boxShadow: '0 18px 50px rgba(30,50,90,.18)',
          backdropFilter: 'blur(10px)',
          opacity: g,
          transform: `translateY(${(1 - g) * 26}px) scale(${0.86 + g * 0.14})`,
          transformOrigin: '50% 100%',
          filter: `blur(${(1 - g) * 6}px)`,
        }}
      >
        {rows.map((r, i) => {
          const ro = lerp(f, [16 + i * 3, 26 + i * 3], [0, 1], EASE.out);
          const active = i === 2;
          return (
            <div
              key={r}
              style={{
                padding: '10px 16px',
                marginBottom: 6,
                borderRadius: 12,
                fontSize: 25,
                fontWeight: active ? 700 : 500,
                color: active ? '#10233f' : 'rgba(16,35,63,.4)',
                background: active ? 'rgba(255,255,255,.95)' : 'transparent',
                boxShadow: active ? '0 4px 14px rgba(30,50,90,.14)' : 'none',
                opacity: ro,
                transform: `translateY(${(1 - ro) * 8}px)`,
              }}
            >
              {r}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 130,
          width: 620,
          height: 62,
          borderRadius: 31,
          background: 'rgba(90,105,130,.55)',
          boxShadow: '0 10px 30px rgba(20,35,60,.25)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 26,
          color: 'rgba(255,255,255,.85)',
          fontSize: 24,
        }}
      >
        Ask anything ✦
      </div>
    </AbsoluteFill>
  );
};

/* A4 — ghost-wipe: settled headline exits with a directional motion-blur smear. */
export const GhostWipe: React.FC = () => {
  const f = useCurrentFrame();
  const p = lerp(f, [30, 46], [0, 1], EASE.in);
  return (
    <AbsoluteFill style={{...WHITE, justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          fontSize: 60,
          fontWeight: 700,
          letterSpacing: -1,
          color: '#141419',
          opacity: 1 - p,
          transform: `translateX(${-p * 300}px) scaleX(${1 + p * 0.7})`,
          transformOrigin: '0% 50%',
          filter: `blur(${p * 12}px)`,
        }}
      >
        Now in one place
      </div>
    </AbsoluteFill>
  );
};
