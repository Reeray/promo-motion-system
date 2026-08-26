import React from 'react';
import {Series} from 'remotion';
import {FONT} from '../lib/palette';
import {Burst3D, BURST_FRAMES, BURST_ITEMS, BURST_TIMING} from '../blocks/burst3d';

/* ============================================================================
 * BURST3D DEMO — review reel comparing the jump-start fraction: 20% / 40% / 60%.
 * Same items, same paths, same easing; only where along the path each flight
 * BEGINS differs. Content is a neutral placeholder set (the reel judges motion).
 * ========================================================================== */

const INK = '#eef1f6';
const MUTED = 'rgba(238,241,246,0.45)';

const skel = (w: number | string, h = 7, o = 0.14): React.CSSProperties => ({
  width: w,
  height: h,
  borderRadius: 4,
  background: `rgba(255,255,255,${o})`,
});

/** Mini UI frames — four content variants cycled by index. */
const MiniFrame: React.FC<{index: number; w: number; h: number}> = ({index, w, h}) => {
  const kind = index % 4;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 10,
        background: '#171b22',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 18px 44px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
        padding: 10,
        fontFamily: FONT.sans,
        overflow: 'hidden',
      }}
    >
      <div style={{display: 'flex', gap: 4, marginBottom: 9}}>
        <span style={{width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.25)'}} />
        <span style={{width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.25)'}} />
        <span style={{...skel(34, 5, 0.1), marginLeft: 4}} />
      </div>
      {kind === 0 && (
        <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
          <div style={skel('82%')} />
          <div style={skel('64%')} />
          <div style={skel('74%', 7, 0.1)} />
          <div style={{...skel(52, 14, 1), background: '#2f6fed', marginTop: 4}} />
        </div>
      )}
      {kind === 1 && (
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 5, height: '58%'}}>
          {[38, 56, 46, 72, 62, 88, 78].map((v, i) => (
            <div key={i} style={{flex: 1, height: `${v}%`, borderRadius: 3, background: i >= 5 ? '#2f6fed' : 'rgba(255,255,255,0.16)'}} />
          ))}
        </div>
      )}
      {kind === 2 && (
        <div style={{display: 'flex', flexDirection: 'column', gap: 7}}>
          {[0, 1, 2].map((r) => (
            <div key={r} style={{display: 'flex', alignItems: 'center', gap: 7}}>
              <span style={{width: 14, height: 14, borderRadius: '50%', background: r === 0 ? '#2f6fed' : 'rgba(255,255,255,0.18)'}} />
              <div style={skel(r === 1 ? '58%' : '72%', 6)} />
            </div>
          ))}
        </div>
      )}
      {kind === 3 && (
        <div>
          <div style={{fontSize: 8.5, letterSpacing: 0.8, textTransform: 'uppercase', color: MUTED, marginBottom: 5}}>Requests</div>
          <div style={{fontSize: 21, fontWeight: 650, color: INK}}>
            1.2M <span style={{fontSize: 9, color: '#4ade80', fontWeight: 600}}>+12%</span>
          </div>
        </div>
      )}
    </div>
  );
};

const CenterLine: React.FC = () => (
  <div style={{textAlign: 'center', fontFamily: FONT.sans}}>
    <div style={{fontSize: 13, letterSpacing: 2.2, textTransform: 'uppercase', color: MUTED, marginBottom: 12, fontWeight: 600}}>
      One platform
    </div>
    <div style={{fontSize: 44, fontWeight: 650, color: INK, letterSpacing: -0.8}}>Everything ships together</div>
  </div>
);

const Section: React.FC<{label: string; jump: number}> = ({label, jump}) => (
  <div style={{position: 'absolute', inset: 0, background: '#0b0d10'}}>
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
        zIndex: 10,
      }}
    >
      {label}
    </div>
    <Burst3D items={BURST_ITEMS} timing={{...BURST_TIMING, jump}} renderItem={(i, item) => <MiniFrame index={i} w={item.size[0]} h={item.size[1]} />}>
      <CenterLine />
    </Burst3D>
  </div>
);

export const Burst3DDemo: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={BURST_FRAMES}>
      <Section label="burst — jump-start 20%" jump={0.2} />
    </Series.Sequence>
    <Series.Sequence durationInFrames={BURST_FRAMES}>
      <Section label="burst — jump-start 40%" jump={0.4} />
    </Series.Sequence>
    <Series.Sequence durationInFrames={BURST_FRAMES}>
      <Section label="burst — jump-start 60%" jump={0.6} />
    </Series.Sequence>
  </Series>
);

export const BURST3D_DEMO_FRAMES = BURST_FRAMES * 3;
