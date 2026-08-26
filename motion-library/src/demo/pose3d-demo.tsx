import React from 'react';
import {Series, useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../lib/ease';
import {FONT} from '../lib/palette';
import {DOLLY_FLYBY_FRAMES, DOLLY_FLYBY_KEYS, Pose3D, PoseLayer} from '../blocks/pose3d';

/* ============================================================================
 * POSE3D DEMO — the review reel for the 3D pose template (see pose3d.tsx STATUS).
 *
 * Content here is a NEUTRAL PLACEHOLDER card, deliberately not a captured surface: the
 * reel judges the MOTION. Per the block law the content is the free half — on admission,
 * any surface or text card rides these exact keys via the render-prop.
 *
 * Dark backdrop on purpose: it is the reference demo's staging for this family, and depth
 * reads strongest against dark. Declared bg + font per the render laws.
 * ========================================================================== */

const INK = '#eef1f6';
const CARD_W = 560;
const CARD_H = 360;

/** The placeholder UI: state 0 = overview tiles, state 1 = the "next keyframe" detail view.
 *  `depth` lifts the floating pieces only when a pose separates layers. */
const DemoCard: React.FC<{state: number; depth: number}> = ({state, depth}) => {
  const f = useCurrentFrame();
  const tile = (i: number): React.CSSProperties => ({
    borderRadius: 10,
    background: 'rgba(255,255,255,0.055)',
    border: '1px solid rgba(255,255,255,0.09)',
    padding: '16px 18px',
    fontSize: 12,
    color: 'rgba(238,241,246,0.55)',
  });
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

      {state === 0 ? (
        <PoseLayer z={55} depth={depth}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
            {['Requests · 1.2M', 'Latency · 84ms', 'Errors · 0.02%', 'Uptime · 99.99%'].map((t, i) => (
              <div key={i} style={{...tile(i), height: 116, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                <div style={{fontSize: 30, fontWeight: 650, color: INK, marginBottom: 8}}>{t.split('·')[1]}</div>
                {t.split('·')[0]}
              </div>
            ))}
          </div>
          <div
            style={{
              position: 'absolute',
              right: 26,
              bottom: 22,
              padding: '10px 18px',
              borderRadius: 10,
              background: '#2f6fed',
              color: '#fff',
              fontSize: 13,
              fontWeight: 650,
            }}
          >
            Upgrade →
          </div>
        </PoseLayer>
      ) : (
        <PoseLayer z={55} depth={depth}>
          <div style={{fontSize: 12, color: 'rgba(238,241,246,0.5)', marginBottom: 10}}>Requests — last 12 weeks</div>
          <div style={{display: 'flex', alignItems: 'flex-end', gap: 10, height: 246}}>
            {[58, 74, 66, 88, 84, 104, 98, 124, 116, 148, 170, 196].map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: lerp(f, [i * 2, i * 2 + 16], [0, h], EASE.out),
                  borderRadius: 5,
                  background: i >= 10 ? '#2f6fed' : 'rgba(255,255,255,0.16)',
                }}
              />
            ))}
          </div>
        </PoseLayer>
      )}
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
      <Section label="dolly fly-by — long dwell at the zoom">
        <Pose3D keys={DOLLY_FLYBY_KEYS} width={CARD_W} height={CARD_H} smooth>
          {(state, depth) => <DemoCard state={state} depth={depth} />}
        </Pose3D>
      </Section>
    </Series.Sequence>
  </Series>
);

export const POSE3D_DEMO_FRAMES = DOLLY_FLYBY_FRAMES;
