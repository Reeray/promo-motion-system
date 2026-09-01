import React from 'react';
import {SplitShowcase} from '../blocks/split-showcase';
import {MacCursor} from '../blocks/pose3d';
import {FONT} from '../lib/palette';

/* ============================================================================
 * PHRASE-SPLIT SHOWCASE DEMO — "Pick your template." cracks open and four
 * generic template mockups step through the gap; the cursor takes the second.
 * Content deliberately neutral (no captured assets — renders on a fresh clone).
 * ========================================================================== */

const CARDS: {bg: string; accent: string; name: string}[] = [
  {bg: 'linear-gradient(160deg, #fdf6ec, #f7e8d6)', accent: '#c2410c', name: 'Atelier'},
  {bg: 'linear-gradient(160deg, #eef4ff, #dbe7ff)', accent: '#1d4ed8', name: 'Northwind'},
  {bg: 'linear-gradient(160deg, #f0fdf4, #dcfce7)', accent: '#15803d', name: 'Verdant'},
  {bg: 'linear-gradient(160deg, #fdf2f8, #fce7f3)', accent: '#be185d', name: 'Bloom'},
];

const TemplateCard: React.FC<{i: number}> = ({i}) => {
  const c = CARDS[i % CARDS.length];
  return (
    // 240px = the reference's card proportion (18.75% of frame width): side cards
    // PEEK from behind the words as slivers instead of burying them
    <div style={{width: 240, borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: '0 18px 40px rgba(16,22,38,0.2)', border: '1px solid rgba(16,22,38,0.08)', fontFamily: FONT.sans}}>
      <div style={{height: 96, background: c.bg, position: 'relative', padding: '9px 11px'}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <span style={{fontSize: 9, fontWeight: 700, color: c.accent}}>{c.name}</span>
          <span style={{display: 'inline-flex', gap: 2.5}}>
            {[0, 1, 2].map((d) => (
              <span key={d} style={{width: 10, height: 4, borderRadius: 2, background: 'rgba(16,22,38,0.14)'}} />
            ))}
          </span>
        </div>
        <div style={{marginTop: 18, fontSize: 15, fontWeight: 800, color: '#1a1e28', letterSpacing: -0.3}}>Stay somewhere new.</div>
        <div style={{marginTop: 5, width: 108, height: 4.5, borderRadius: 2.5, background: 'rgba(16,22,38,0.18)'}} />
        <div style={{marginTop: 3, width: 78, height: 4.5, borderRadius: 2.5, background: 'rgba(16,22,38,0.12)'}} />
      </div>
      <div style={{display: 'flex', gap: 6, padding: 9}}>
        {[0, 1, 2].map((b) => (
          <div key={b} style={{flex: 1, height: 30, borderRadius: 5, background: b === 1 ? c.bg : '#f3f4f6'}} />
        ))}
      </div>
    </div>
  );
};

export const SPLIT_DEMO_FRAMES = 168;

export const SplitShowcaseDemo: React.FC = () => (
  <div style={{background: '#fbfbfd'}}>
    <SplitShowcase
      left={<span style={{fontFamily: FONT.sans, fontSize: 58, fontWeight: 700, color: '#14161c', letterSpacing: -1}}>Pick your</span>}
      right={<span style={{fontFamily: FONT.sans, fontSize: 58, fontWeight: 700, color: '#14161c', letterSpacing: -1}}>template.</span>}
      renderCard={(i) => <TemplateCard i={i} />}
      pick={1}
      cursor={(t, pressing) => <MacCursor land={{x: 688, y: 412}} t={t} from={{x: 1420, y: 690}} press={pressing} size={44} />}
    />
  </div>
);
