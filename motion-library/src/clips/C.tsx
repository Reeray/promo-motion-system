import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../lib/ease';

const WHITE: React.CSSProperties = {backgroundColor: '#fff'};

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
          background: '#fff',
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
        }}
      >
        <div
          style={{
            width: 760,
            borderRadius: 24,
            background: '#fff',
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
          fontFamily: 'Consolas, monospace',
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

/* C11b — log-theater ZOOMED: the log-theater framed the way GPT-5.5 actually frames it —
   a static MACRO camera crop. The AcmeCo window is rendered LARGER than the viewport and
   pinned to the top-left corner (traffic-lights + toolbar cropped at the frame edges); the
   agent feed streams and auto-scrolls INSIDE it while the camera holds.
   MEASURED (60fps): the macro settles on entry — window scales ~0.9→1.0 while translating
   toward its top-left anchor (ease-out, ~0.6s, NO overshoot) — then holds with a ~2%/s
   breathe. Rows appear at full size and SLIDE up (~18px, ease-out) — no per-row scale. */
export const LogTheaterZoomed: React.FC = () => {
  const f = useCurrentFrame();
  // camera: settle the macro zoom (0.9 -> 1.0, strong ease-out) then breathe on the hold.
  const settle = lerp(f, [0, 16], [0.9, 1], EASE.camera);
  const breathe = 1 + Math.max(0, f - 16) * 0.0006;
  const camScale = settle * breathe;

  const headerSwap = lerp(f, [40, 48], [0, 1], EASE.out); // "Using Slack" -> "Using Github"

  // streaming agent feed — each row appears full-size and slides up (measured: no scale).
  const feed = [
    {t: 'Searched channels “alpha-bug-reports”', c: '#e01e5a', at: 6},
    {t: 'Read messages', c: '#36c5f0', at: 15},
    {t: 'Opened pull request', c: '#24292f', at: 25},
    {t: 'Read check-static.js', c: '#8957e5', at: 36},
    {t: 'Implemented the fix', c: '#2da44e', at: 47},
    {t: 'Created reply after PR merge', c: '#0969da', at: 58},
  ];
  const ROW = 84;
  const VISIBLE = 4;
  // auto-scroll: once the feed overflows, glide the list up so the newest rows stay in view.
  let scroll = 0;
  feed.forEach((r, i) => {
    if (i >= VISIBLE) scroll += ROW * lerp(f, [r.at, r.at + 11], [0, 1], EASE.out);
  });

  return (
    <AbsoluteFill style={{...WHITE, overflow: 'hidden'}}>
      {/* CAMERA layer — macro crop anchored to the window's top-left */}
      <AbsoluteFill style={{transform: `scale(${camScale})`, transformOrigin: '0% 0%'}}>
        <div
          style={{
            position: 'absolute',
            left: 60,
            top: 34,
            width: 1520, // wider than the 1280 frame → the right edge is cropped
            height: 900,
            background: '#fff',
            borderRadius: 22,
            border: '1px solid rgba(0,0,0,.06)',
            boxShadow: '0 8px 24px rgba(0,0,0,.06), 0 40px 90px rgba(20,30,60,.14)',
            overflow: 'hidden',
          }}
        >
          {/* window chrome */}
          <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '26px 30px 20px'}}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
              <div key={c} style={{width: 22, height: 22, borderRadius: 11, background: c}} />
            ))}
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{width: 22, height: 22, borderRadius: 6, border: '2.5px solid #c9ccd1', marginLeft: i === 0 ? 20 : 0}} />
            ))}
            <span style={{marginLeft: 26, fontSize: 30, color: '#3a3a40', fontWeight: 500}}>AcmeCo</span>
          </div>
          <div style={{height: 1, background: 'rgba(0,0,0,.07)'}} />

          {/* content — the feed scrolls behind the fixed header */}
          <div style={{position: 'relative', height: 780, padding: '30px 46px', overflow: 'hidden'}}>
            <div style={{transform: `translateY(${-scroll}px)`}}>
              <div style={{position: 'relative', height: 60, marginBottom: 22}}>
                <div style={{position: 'absolute', fontSize: 42, fontWeight: 600, color: '#9a9aa2', opacity: 1 - headerSwap, transform: `translateY(${-headerSwap * 14}px)`}}>
                  Using Slack
                </div>
                <div style={{position: 'absolute', fontSize: 42, fontWeight: 600, color: '#9a9aa2', opacity: headerSwap, transform: `translateY(${(1 - headerSwap) * 14}px)`}}>
                  Using Github
                </div>
              </div>
              {feed.map((r) => {
                const p = lerp(f, [r.at, r.at + 9], [0, 1], EASE.out);
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
                    <div style={{width: 40, height: 40, borderRadius: 10, background: r.c, flexShrink: 0}} />
                    <span style={{fontSize: 34, color: '#1c1c1f', whiteSpace: 'nowrap'}}>{r.t}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* macro-framing readout (stays fixed on the viewport, like camera macro-push) */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 24,
          fontFamily: 'Consolas, monospace',
          fontSize: 18,
          fontWeight: 700,
          color: '#111',
          background: 'rgba(255,255,255,.82)',
          borderRadius: 8,
          padding: '4px 10px',
        }}
      >
        MACRO · window fills frame
      </div>
    </AbsoluteFill>
  );
};

/* C12 — dark-payoff cut: quiet white workspace → single-frame HARD CUT into a
   full-bleed dark result; stats pop in staggered. Light is grammar: dark = done. */
export const DarkPayoffCut: React.FC = () => {
  const f = useCurrentFrame();
  const CUT = 34;
  if (f < CUT) {
    const drift = 1 + f * 0.0006;
    return (
      <AbsoluteFill style={{...WHITE, justifyContent: 'center', alignItems: 'center'}}>
        <div
          style={{
            width: 780,
            height: 460,
            borderRadius: 16,
            border: '1px solid rgba(0,0,0,.08)',
            boxShadow: '0 16px 60px rgba(0,0,0,.08)',
            padding: 36,
            transform: `scale(${drift})`,
          }}
        >
          {[220, 420, 360, 300, 460, 180, 380].map((w, i) => (
            <div key={i} style={{width: w, height: 15, borderRadius: 8, background: 'rgba(0,0,0,.09)', marginBottom: 18}} />
          ))}
          <div style={{width: 260, height: 15, borderRadius: 8, background: 'rgba(64,120,255,.35)'}} />
        </div>
      </AbsoluteFill>
    );
  }
  const stats = [
    {v: '$15.2M', l: 'Revenue', at: CUT + 6},
    {v: '$2.5M', l: 'Adj. EBITDA', at: CUT + 10},
    {v: '$63.4M', l: 'Exit ARR', at: CUT + 14},
    {v: '$18.4M', l: 'Cash', at: CUT + 18},
  ];
  return (
    <AbsoluteFill style={{background: '#0c0f16', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{width: 900}}>
        <div style={{color: '#fff', fontSize: 38, fontWeight: 700, marginBottom: 8}}>Executive Summary</div>
        <div style={{color: 'rgba(255,255,255,.45)', fontSize: 18, marginBottom: 34}}>
          Q3 ahead of plan. Focus shifts to conversion and retention.
        </div>
        <div style={{display: 'flex', gap: 18}}>
          {stats.map((s) => {
            const p = lerp(f, [s.at, s.at + 8], [0, 1], EASE.outStrong);
            return (
              <div
                key={s.l}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,.06)',
                  border: '1px solid rgba(255,255,255,.1)',
                  padding: '22px 24px',
                  opacity: p,
                  transform: `translateY(${(1 - p) * 14}px) scale(${0.95 + p * 0.05})`,
                }}
              >
                <div style={{color: '#fff', fontSize: 32, fontWeight: 700, fontVariantNumeric: 'tabular-nums'}}>{s.v}</div>
                <div style={{color: 'rgba(255,255,255,.5)', fontSize: 16, marginTop: 6}}>{s.l}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
