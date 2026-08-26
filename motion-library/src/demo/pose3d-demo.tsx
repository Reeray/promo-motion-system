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
 * Layout system: 22px gutters, 12px gaps, 10px tile radii. The footer is where the story
 * lives — the quota bar says WHY the user upgrades, and it is what the click changes.
 *
 * Coordinate-frame law (learned the hard way): anything that must align with the cursor —
 * the button, footer, divider — is a DIRECT card child with its own translateZ lift. A
 * PoseLayer's transform becomes the containing block and re-anchors right/bottom to its
 * own flow box, not the card.
 * ========================================================================== */

const INK = '#eef1f6';
const MUTED = 'rgba(238,241,246,0.45)';
const CARD_W = 560;
const CARD_H = 360;
const GUTTER = 22;
const B = FLYBY_BEATS;

const LABEL: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: 0.9,
  textTransform: 'uppercase',
  color: MUTED,
};

/** Cursor: glides in from the lower-left, lands on the button, dips for the press. */
const Cursor: React.FC<{depth: number}> = ({depth}) => {
  const f = useCurrentFrame();
  if (f < B.cursorEnter) return null;
  const x = lerp(f, [B.cursorEnter, B.cursorArrive], [96, CARD_W - 122], EASE.inOut);
  const y = lerp(f, [B.cursorEnter, B.cursorArrive], [CARD_H + 26, CARD_H - 50], EASE.inOut);
  const press = f >= B.press && f < B.release ? 0.8 : 1;
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

/** The button — the subject of the whole shot: idle → pressed → loading → done. */
const UpgradeButton: React.FC<{depth: number}> = ({depth}) => {
  const f = useCurrentFrame();
  const pressed = f >= B.press && f < B.release;
  const loading = f >= B.release && f < B.loaded;
  const done = f >= B.loaded;
  const spin = ((f - B.release) / 14) * 360;
  const pop = pressed ? 0.96 : done ? lerp(f, [B.loaded, B.loaded + 8], [1.1, 1], EASE.out) : 1;
  return (
    <div
      style={{
        position: 'absolute',
        right: GUTTER,
        bottom: 26,
        minWidth: 126,
        padding: '10px 18px',
        borderRadius: 10,
        background: done ? '#1f9d5b' : pressed ? '#1c4aad' : '#2f6fed',
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

/** Footer plan status — the WHY of the click, and what the click changes. */
const PlanStatus: React.FC<{depth: number}> = ({depth}) => {
  const f = useCurrentFrame();
  const done = f >= B.loaded;
  const fill = done ? lerp(f, [B.loaded, B.loaded + 10], [86, 100], EASE.out) : 86;
  return (
    <div style={{position: 'absolute', left: GUTTER, bottom: 24, transform: `translateZ(${55 * depth}px)`}}>
      <div style={{fontSize: 12.5, fontWeight: 600, color: INK, marginBottom: 6}}>
        {done ? 'Pro plan' : 'Free plan'}
      </div>
      <div style={{width: 148, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.10)', marginBottom: 7}}>
        <div
          style={{
            width: `${fill}%`,
            height: '100%',
            borderRadius: 2,
            background: done ? '#4ade80' : '#e8a33d',
          }}
        />
      </div>
      <div style={{fontSize: 11, color: MUTED}}>{done ? 'Unlimited storage' : '8.6 GB of 10 GB used'}</div>
    </div>
  );
};

const BARS = [24, 30, 27, 36, 33, 42, 39, 48, 45, 54, 60, 68];

/** The card: metric tiles + traffic chart + plan footer. */
const DemoCard: React.FC<{depth: number}> = ({depth}) => {
  const metrics: [string, string, string][] = [
    ['Requests', '1.2M', '+12%'],
    ['Latency', '84ms', '-6ms'],
    ['Errors', '0.02%', '-0.01%'],
  ];
  const tileStyle: React.CSSProperties = {
    borderRadius: 10,
    background: 'rgba(255,255,255,0.045)',
    border: '1px solid rgba(255,255,255,0.07)',
    padding: '13px 16px',
  };
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
        padding: `18px ${GUTTER}px`,
        position: 'relative',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* header */}
      <div style={{display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14}}>
        <span style={{width: 8, height: 8, borderRadius: '50%', background: '#ff5f57'}} />
        <span style={{width: 8, height: 8, borderRadius: '50%', background: '#febc2e'}} />
        <span style={{width: 8, height: 8, borderRadius: '50%', background: '#28c840'}} />
        <span style={{marginLeft: 9, fontSize: 15, fontWeight: 600}}>Usage analytics</span>
        <div style={{marginLeft: 'auto'}}>
          <PoseLayer z={110} depth={depth}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 650,
                letterSpacing: 0.6,
                padding: '4px 10px 4px 8px',
                borderRadius: 20,
                background: '#2f6fed',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span style={{width: 5, height: 5, borderRadius: '50%', background: '#fff'}} />
              LIVE
            </span>
          </PoseLayer>
        </div>
      </div>

      <PoseLayer z={55} depth={depth}>
        {/* metric tiles */}
        <div style={{display: 'flex', gap: 12, marginBottom: 12}}>
          {metrics.map(([label, value, delta], i) => (
            <div key={i} style={{...tileStyle, flex: 1}}>
              <div style={{...LABEL, marginBottom: 7}}>{label}</div>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 7}}>
                <span style={{fontSize: 25, fontWeight: 650, letterSpacing: -0.3}}>{value}</span>
                <span style={{fontSize: 11, fontWeight: 600, color: '#4ade80'}}>{delta}</span>
              </div>
            </div>
          ))}
        </div>

        {/* traffic chart */}
        <div style={{...tileStyle, height: 112, display: 'flex', flexDirection: 'column'}}>
          <div style={{...LABEL, marginBottom: 10}}>Traffic — last 12 weeks</div>
          <div style={{display: 'flex', alignItems: 'flex-end', gap: 9, flex: 1}}>
            {BARS.map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: h,
                  borderRadius: 3,
                  background: i >= 9 ? '#2f6fed' : 'rgba(255,255,255,0.14)',
                }}
              />
            ))}
          </div>
        </div>
      </PoseLayer>

      {/* footer — direct card children so they share the cursor's coordinate frame */}
      <div
        style={{
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          bottom: 84,
          height: 1,
          background: 'rgba(255,255,255,0.07)',
          transform: `translateZ(${55 * depth}px)`,
        }}
      />
      <PlanStatus depth={depth} />
      <UpgradeButton depth={depth} />
      <Cursor depth={depth} />
    </div>
  );
};

const Section: React.FC<{label?: string; children: React.ReactNode}> = ({label, children}) => (
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
    {label ? (
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
    ) : null}
    {children}
  </div>
);

/** Gallery block: the admitted fly-by over the interactive card, no reel chrome. */
export const DollyFlybyDemo: React.FC = () => (
  <Section>
    <Pose3D keys={DOLLY_FLYBY_KEYS} width={CARD_W} height={CARD_H} smooth>
      {(_state, depth) => <DemoCard depth={depth} />}
    </Pose3D>
  </Section>
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
