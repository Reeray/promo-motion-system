import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {EASE, lerp} from '../lib/ease';

import {PX, PD, FONT} from '../lib/palette';

const WHITE: React.CSSProperties = {backgroundColor: PX.bg, fontFamily: FONT.sans};

/* C10 — chip-tokenize: a typed @-mention converts in place into a colored tool chip
   ~0.1s after the word completes; typing continues. Chips are the only accent color. */
export const ChipTokenize: React.FC = () => {
  const f = useCurrentFrame();
  const pre = 'Use ';
  const mention = '@browser';
  const post = ' to solve the cube';
  const full = pre + mention + post;
  const n = Math.min(full.length, Math.floor(lerp(f, [8, 46], [0, full.length], (t) => t)));
  const mentionDone = n >= (pre + mention).length;
  const tokenP = mentionDone ? lerp(f, [24, 30], [0, 1], EASE.back) : 0;
  const caretOn = Math.floor(f / 8) % 2 === 0;

  const typedPost = n > (pre + mention).length ? post.slice(0, n - (pre + mention).length) : '';
  return (
    <AbsoluteFill style={{...WHITE, justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          width: 880,
          borderRadius: 26,
          background: PX.card,
          boxShadow: '0 2px 6px rgba(0,0,0,.05), 0 18px 60px rgba(0,0,0,.12)',
          border: '1px solid rgba(0,0,0,.06)',
          padding: '30px 34px 24px',
        }}
      >
        <div style={{fontSize: 30, color: '#17171a', display: 'flex', alignItems: 'center', minHeight: 44}}>
          <span>{full.slice(0, Math.min(n, pre.length))}</span>
          {n > pre.length && (tokenP === 0 ? (
            <span>{mention.slice(0, n - pre.length)}</span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#efe3fd',
                color: '#7a3ff2',
                fontWeight: 600,
                borderRadius: 10,
                padding: '3px 12px',
                margin: '0 2px',
                transform: `scale(${0.85 + tokenP * 0.15})`,
              }}
            >
              <span style={{width: 12, height: 12, background: '#7a3ff2', transform: 'rotate(45deg)', borderRadius: 2, display: 'inline-block'}} />
              Browser
            </span>
          ))}
          <span>{typedPost}</span>
          <span style={{opacity: caretOn ? 1 : 0, fontWeight: 300, marginLeft: 2}}>|</span>
        </div>
        <div style={{marginTop: 20, display: 'flex', alignItems: 'center', gap: 18, color: 'rgba(0,0,0,.45)', fontSize: 17}}>
          <span>＋</span>
          <span>🖐 Ask Permissions ▾</span>
          <span style={{marginLeft: 'auto'}}>5.5 High ▾</span>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: '#111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* CSS chevron-up (glyphs are unreliable in the headless renderer) */}
            <span
              style={{
                width: 12,
                height: 12,
                borderLeft: '3.5px solid #fff',
                borderTop: '3.5px solid #fff',
                transform: 'rotate(45deg) translateY(2px)',
                borderRadius: 2,
                display: 'inline-block',
              }}
            />
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* C-cam — camera macro-push: the viewport pushes IN to showcase a hero component
   (the prompt bar) right before an interaction. MEASURED from GPT-5.5: ~1.6× scale over
   ~0.5s with a strong ease-out that decelerates into the hold (EASE.camera). Origin =
   the component's center. A live readout shows the current zoom factor. */
export const CameraPush: React.FC = () => {
  const f = useCurrentFrame();
  const z = lerp(f, [10, 25], [1, 1.6], EASE.camera); // hold, then 0.5s push @30fps
  const breathe = 1 + Math.max(0, f - 25) * 0.0006; // ~2%/s breathe during the hold
  return (
    <AbsoluteFill style={{...WHITE, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          transform: `scale(${z * breathe})`,
          transformOrigin: '50% 46%',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(180deg,#fbfbfd,#eef1f6)',
          fontFamily: FONT.sans,
        }}
      >
        <div
          style={{
            width: 760,
            borderRadius: 24,
            background: PX.card,
            boxShadow: '0 2px 6px rgba(0,0,0,.05), 0 26px 70px rgba(20,30,60,.14)',
            border: '1px solid rgba(0,0,0,.05)',
            padding: '26px 30px 20px',
          }}
        >
          <div style={{fontSize: 26, color: '#9aa0ab'}}>Ask anything…</div>
          <div style={{marginTop: 22, display: 'flex', alignItems: 'center', gap: 16, color: 'rgba(0,0,0,.42)', fontSize: 16}}>
            <span>＋</span>
            <span>🖐 Ask Permissions ▾</span>
            <span style={{marginLeft: 'auto'}}>5.5 High ▾</span>
            <span style={{width: 38, height: 38, borderRadius: 19, background: '#111', display: 'grid', placeItems: 'center'}}>
              <span style={{width: 11, height: 11, borderLeft: '3px solid #fff', borderTop: '3px solid #fff', transform: 'rotate(45deg) translateY(2px)', borderRadius: 2}} />
            </span>
          </div>
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: 22,
          right: 26,
          fontFamily: FONT.mono,
          fontSize: 20,
          fontWeight: 700,
          color: '#111',
          background: 'rgba(255,255,255,.8)',
          borderRadius: 8,
          padding: '4px 10px',
        }}
      >
        {z.toFixed(2)}×
      </div>
    </AbsoluteFill>
  );
};

/* C11 — log-theater: agent work as an accumulating checklist; the "Using X" header
   swaps as tools change; "Thinking" shimmers. Every motion is caused by the agent. */
export const LogTheater: React.FC = () => {
  const f = useCurrentFrame();
  const headerSwap = lerp(f, [38, 44], [0, 1], EASE.out);
  const rows = [
    {t: 'Searched channels “alpha-bug-reports”', icon: '#e01e5a', at: 14},
    {t: 'Read messages', icon: '#36c5f0', at: 26},
    {t: 'Opened pull request', icon: '#171515', at: 48},
  ];
  const shimmer = 0.35 + 0.3 * Math.sin(f / 3.2);
  return (
    <AbsoluteFill style={{...WHITE, justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          width: 760,
          minHeight: 420,
          borderRadius: 18,
          border: '1px solid rgba(0,0,0,.07)',
          boxShadow: '0 20px 70px rgba(0,0,0,.09)',
          padding: '26px 40px',
        }}
      >
        <div style={{display: 'flex', gap: 8, marginBottom: 26}}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <div key={c} style={{width: 13, height: 13, borderRadius: 7, background: c}} />
          ))}
          <span style={{marginLeft: 'auto', color: '#999', fontSize: 16}}>AcmeCo</span>
        </div>
        <div style={{position: 'relative', height: 42, marginBottom: 18}}>
          <div style={{position: 'absolute', fontSize: 30, fontWeight: 600, color: '#666', opacity: 1 - headerSwap, transform: `translateY(${-headerSwap * 12}px)`}}>
            Using Slack
          </div>
          <div style={{position: 'absolute', fontSize: 30, fontWeight: 600, color: '#666', opacity: headerSwap, transform: `translateY(${(1 - headerSwap) * 12}px)`}}>
            Using Github
          </div>
        </div>
        {rows.map((r) => {
          const p = lerp(f, [r.at, r.at + 9], [0, 1], EASE.out);
          return (
            <div
              key={r.t}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginBottom: 16,
                opacity: p,
                transform: `translateY(${(1 - p) * 10}px)`,
              }}
            >
              <div style={{width: 22, height: 22, borderRadius: 6, background: r.icon}} />
              <span style={{fontSize: 23, color: '#1c1c1f'}}>{r.t}</span>
            </div>
          );
        })}
        <div style={{fontSize: 23, color: '#000', opacity: f > 58 ? shimmer : 0, marginTop: 8}}>Thinking</div>
      </div>
    </AbsoluteFill>
  );
};

/* ── MACRO-CROP LOG (treatment) ───────────────────────────────────────────────
   The log-theater framed the way GPT-5.5 frames it: a STATIC macro camera crop.
   The window is rendered LARGER than the viewport and pinned to the top-left corner
   (chrome cropped at the frame edges); the feed streams and auto-scrolls INSIDE while
   the camera holds still.
   MEASURED (60fps): the macro settles on entry — window scales ~0.9→1.0 toward its
   top-left anchor (ease-out, ~0.55s, NO overshoot) — then holds with a ~2%/s breathe.
   Rows appear at FULL SIZE and slide up ~18px, ease-out. No per-row scale.

   MOTION IS LOCKED. Content (title, rows, lead) is a parameter — same rule as the
   text layer. Timings derive from fps, so it is correct at 30 and 60fps alike. */
export type LogRow = {t: string; c: string; at: number};

export const MacroCropLog: React.FC<{
  title: string;
  rows: LogRow[];
  header?: React.ReactNode;
  lead?: React.ReactNode;
  dark?: boolean;
  badge?: string;
  /** Scale the push starts from. Lower = stronger zoom into the macro position. */
  zoomFrom?: number;
  /** Row marker: 'square' = app/tool icons (reference style), 'check' = completed steps. */
  icon?: 'square' | 'check';
}> = ({title, rows, header, lead, dark = false, badge, zoomFrom = 0.72, icon = 'square'}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pal = dark ? PD : PX;

  const settleF = Math.round(fps * 0.55);
  const rowF = Math.round(fps * 0.3);
  /* Strong push into the macro position, then HOLD DEAD STILL.
     MEASURED: the reference's log-theater window chrome is pixel-identical at 20.3s and
     30.0s — the camera does NOT drift once it arrives. The motion is the feed streaming,
     not the camera. Any continued zoom after the settle is wrong. */
  const camScale = lerp(f, [0, settleF], [zoomFrom, 1], EASE.camera);

  const ROW = 84;
  const VISIBLE = lead ? 3 : 4;
  let scroll = 0;
  rows.forEach((r, i) => {
    if (i >= VISIBLE) scroll += ROW * lerp(f, [r.at, r.at + rowF], [0, 1], EASE.out);
  });

  return (
    <AbsoluteFill style={{backgroundColor: pal.bg, fontFamily: FONT.sans, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `scale(${camScale})`, transformOrigin: '0% 0%'}}>
        <div
          style={{
            position: 'absolute',
            left: 60,
            top: 34,
            width: 1520, // wider than the 1280 frame → right edge is cropped
            height: 900,
            background: pal.card,
            borderRadius: 22,
            border: `1px solid ${pal.border}`,
            boxShadow: dark ? 'none' : '0 8px 24px rgba(0,0,0,.06), 0 40px 90px rgba(20,30,60,.14)',
            overflow: 'hidden',
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '26px 30px 20px'}}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
              <div key={c} style={{width: 22, height: 22, borderRadius: 11, background: c}} />
            ))}
            <span style={{marginLeft: 22, fontSize: 30, color: pal.fg, fontWeight: 500}}>{title}</span>
          </div>
          <div style={{height: 1, background: pal.border}} />

          <div style={{position: 'relative', height: 780, padding: '30px 46px', overflow: 'hidden'}}>
            <div style={{transform: `translateY(${-scroll}px)`}}>
              {lead}
              {header && <div style={{fontSize: 42, fontWeight: 600, color: pal.muted, marginBottom: 22}}>{header}</div>}
              {rows.map((r) => {
                const p = lerp(f, [r.at, r.at + rowF], [0, 1], EASE.out);
                if (p <= 0) return null;
                return (
                  <div
                    key={r.t}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 22,
                      height: ROW - 22,
                      marginBottom: 22,
                      opacity: p,
                      transform: `translateY(${(1 - p) * 18}px)`, // slide-up settle, no scale
                    }}
                  >
                    {icon === 'check' ? (
                      <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={r.c} strokeWidth="3" style={{flexShrink: 0}}>
                        <path d="M5 12.5l4.5 4.5L19 6.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <div style={{width: 40, height: 40, borderRadius: 10, background: r.c, flexShrink: 0}} />
                    )}
                    <span style={{fontSize: 34, color: pal.fg, whiteSpace: 'nowrap'}}>{r.t}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {badge && (
        <div style={{position: 'absolute', top: 20, right: 24, fontFamily: FONT.mono, fontSize: 18, fontWeight: 700, color: '#111', background: 'rgba(255,255,255,.82)', borderRadius: 8, padding: '4px 10px'}}>
          {badge}
        </div>
      )}
    </AbsoluteFill>
  );
};

/* C11b — gallery demo: the treatment with placeholder content. */
export const LogTheaterZoomed: React.FC = () => (
  <MacroCropLog
    title="AcmeCo"
    header="Using Github"
    badge="MACRO · window fills frame"
    rows={[
      {t: 'Searched channels “alpha-bug-reports”', c: '#e01e5a', at: 6},
      {t: 'Read messages', c: '#36c5f0', at: 15},
      {t: 'Opened pull request', c: '#24292f', at: 25},
      {t: 'Read check-static.js', c: '#8957e5', at: 36},
      {t: 'Implemented the fix', c: '#2da44e', at: 47},
      {t: 'Created reply after PR merge', c: '#0969da', at: 58},
    ]}
  />
);
