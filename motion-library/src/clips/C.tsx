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
