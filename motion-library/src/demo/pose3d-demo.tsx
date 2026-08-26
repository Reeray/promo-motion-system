import React from 'react';
import {Series, useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../lib/ease';
import {FONT} from '../lib/palette';
import {DOLLY_FLYBY_FRAMES, DOLLY_FLYBY_KEYS, FLYBY_BEATS, Pose3D, PoseLayer} from '../blocks/pose3d';

/* ============================================================================
 * POSE3D DEMO — review reel for the MOTIVATED dolly fly-by.
 *
 * "The zoom is usually for what's happening in the UI" — so the card carries the happening:
 * a cursor glides to the Upgrade button, presses it, the button loads, the plan flips to Pro
 * — and the camera's approach/dwell/departure aim at exactly that spot (the pose table's
 * fx/fy) on the same FLYBY_BEATS clock. The zoom has a subject; the exit has a reason.
 *
 * The interaction lives in CONTENT (inside the card, riding every pose) — the template
 * stays motion-only, per the block law. The cursor lifts on the layer-pop channel so it
 * stays above popped content, like a cursor on a screen being filmed.
 * ========================================================================== */

const INK = '#eef1f6';
const CARD_W = 560;
const CARD_H = 360;
const B = FLYBY_BEATS;

/** Cursor: glides in from the lower-left, lands on the button, dips for the press. */
const Cursor: React.FC<{depth: number}> = ({depth}) => {
  const f = useCurrentFrame();
  if (f < B.cursorEnter) return null;
  const x = lerp(f, [B.cursorEnter, B.cursorArrive], [96, CARD_W - 122], EASE.inOut);
  const y = lerp(f, [B.cursorEnter, B.cursorArrive], [CARD_H + 26, CARD_H - 50], EASE.inOut);
  const press = f >= B.press && f < B.release ? 0.85 : 1;
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translateZ(${130 * depth}px) scale(${press})`,
        filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.55))',
      }}
    >
      <path d="M5 3 L19 12.5 L12.6 13.8 L15.6 20.4 L13 21.5 L10.1 14.8 L5 19 Z" fill="#fff" stroke="#0b0d10" strokeWidth="1.4" />
    </svg>
  );
};

/** The button — the subject of the whole shot: idle → pressed → loading → done.
 *  A DIRECT card child (not inside PoseLayer — its translateZ would become the containing
 *  block and re-anchor right/bottom to the grid box) so it shares the cursor's coordinate
 *  frame; it carries its own layer-lift instead. */
const UpgradeButton: React.FC<{depth: number}> = ({depth}) => {
  const f = useCurrentFrame();
  const pressed = f >= B.press && f < B.release;
  const loading = f >= B.release && f < B.loaded;
  const done = f >= B.loaded;
  const spin = ((f - B.release) / 14) * 360;
  const pop = done ? lerp(f, [B.loaded, B.loaded + 8], [1.1, 1], EASE.out) : 1;
  return (
    <div
      style={{
        position: 'absolute',
        right: 26,
        bottom: 22,
        minWidth: 118,
        padding: '10px 18px',
        borderRadius: 10,
        background: done ? '#1f9d5b' : pressed ? '#2153bd' : '#2f6fed',
        color: '#fff',
        fontSize: 13,
        fontWeight: 650,
        textAlign: 'center',
        transform: `translateZ(${55 * depth}px) translateY(${pressed ? 1.5 : 0}px) scale(${pop})`,
        boxShadow: pressed ? 'none' : '0 4px 14px rgba(47,111,237,0.35)',
      }}
    >
      {loading ? (
        <svg width={15} height={15} viewBox="0 0 20 20" style={{transform: `rotate(${spin}deg)`, verticalAlign: -2}}>
          <circle cx="10" cy="10" r="7.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
          <circle cx="10" cy="10" r="7.5" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="14 33" strokeLinecap="round" />
        </svg>
      ) : done ? (
        'Upgraded ✓'
      ) : (
        'Upgrade →'
      )}
      {f >= B.release && f < B.release + 12 && (
        <span
          style={{
            position: 'absolute',
            inset: -((f - B.release) * 2.2),
            borderRadius: 16,
            border: '1.5px solid rgba(255,255,255,0.7)',
            opacity: 1 - (f - B.release) / 12,
          }}
        />
      )}
    </div>
  );
};

/** The card: metric tiles whose Plan tile is what the upgrade CHANGES — the data payoff. */
const DemoCard: React.FC<{depth: number}> = ({depth}) => {
  const f = useCurrentFrame();
  const done = f >= B.loaded;
  const tiles: [string, string, boolean][] = [
    ['1.2M', 'Requests', false],
    ['84ms', 'Latency', false],
    ['0.02%', 'Errors', false],
    [done ? 'Pro' : 'Free', 'Plan', true],
  ];
  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 16,
        background: '#14171d',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        fontFamily: FONT.sans,
        color: INK,
        padding: 18,
        position: 'relative',
        transformStyle: 'preserve-3d',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14}}>
        <span style={{width: 9, height: 9, borderRadius: '50%', background: '#ff5f57'}} />
        <span style={{width: 9, height: 9, borderRadius: '50%', background: '#febc2e'}} />
        <span style={{width: 9, height: 9, borderRadius: '50%', background: '#28c840'}} />
        <span style={{marginLeft: 10, fontSize: 15, fontWeight: 600}}>Usage analytics</span>
        <PoseLayer z={110} depth={depth}>
          <span
            style={{
              marginLeft: 12,
              fontSize: 11,
              padding: '4px 10px',
              borderRadius: 20,
              background: '#2f6fed',
              color: '#fff',
              fontWeight: 600,
              display: 'inline-block',
            }}
          >
            LIVE
          </span>
        </PoseLayer>
      </div>

      <PoseLayer z={55} depth={depth}>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
          {tiles.map(([v, label, isPlan], i) => (
            <div
              key={i}
              style={{
                borderRadius: 10,
                background: 'rgba(255,255,255,0.055)',
                border: `1px solid ${isPlan && done ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.09)'}`,
                padding: '16px 18px',
                fontSize: 12,
                color: 'rgba(238,241,246,0.55)',
                height: 116,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div style={{fontSize: 30, fontWeight: 650, color: isPlan && done ? '#4ade80' : INK, marginBottom: 8}}>{v}</div>
              {label}
            </div>
          ))}
        </div>
      </PoseLayer>

      <UpgradeButton depth={depth} />
      <Cursor depth={depth} />
    </div>
  );
};

const Section: React.FC<{label: string; children: React.ReactNode}> = ({label, children}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: '#0b0d10',
      fontFamily: FONT.sans,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: 34,
        left: 44,
        fontFamily: FONT.mono,
        fontSize: 13,
        letterSpacing: 1.5,
        color: 'rgba(238,241,246,0.45)',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
    {children}
  </div>
);

export const Pose3DDemo: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={DOLLY_FLYBY_FRAMES}>
      <Section label="dolly fly-by — the camera chases the click">
        <Pose3D keys={DOLLY_FLYBY_KEYS} width={CARD_W} height={CARD_H} smooth>
          {(_state, depth) => <DemoCard depth={depth} />}
        </Pose3D>
      </Section>
    </Series.Sequence>
  </Series>
);

export const POSE3D_DEMO_FRAMES = DOLLY_FLYBY_FRAMES;
