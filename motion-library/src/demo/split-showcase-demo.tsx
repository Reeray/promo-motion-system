import React from 'react';
import {SplitShowcase} from '../blocks/split-showcase';
import {MacCursor} from '../blocks/pose3d';
import {FONT} from '../lib/palette';

/* ============================================================================
 * PHRASE-SPLIT SHOWCASE DEMO — "Pick your template." cracks open and website
 * heroes step through the gap; the cursor takes the second. Cards are built to
 * the reference's contrast: full-bleed dark/warm scenes with serif brands —
 * generic content, fresh-clone safe (CSS only, no captured assets).
 * ========================================================================== */

const SERIF = 'Charter, Georgia, serif';

type Tpl = {bg: string; ink: string; sub: string; name: string; glow?: string};
const CARDS: Tpl[] = [
  {bg: 'linear-gradient(165deg, #16253b 0%, #0e1a2c 55%, #27405e 100%)', ink: '#f4efe6', sub: 'rgba(244,239,230,0.55)', name: 'Aurelia', glow: 'radial-gradient(90px 60px at 78% 22%, rgba(120,170,255,0.35), transparent)'},
  {bg: 'linear-gradient(160deg, #f4e8d8 0%, #e8d3b8 60%, #d9bd97 100%)', ink: '#2b2018', sub: 'rgba(43,32,24,0.55)', name: 'Kaffee', glow: 'radial-gradient(110px 70px at 24% 80%, rgba(255,255,255,0.5), transparent)'},
  {bg: 'linear-gradient(165deg, #0f2b22 0%, #143528 55%, #2e5c40 100%)', ink: '#eef5ec', sub: 'rgba(238,245,236,0.55)', name: 'Verdant', glow: 'radial-gradient(100px 60px at 70% 75%, rgba(150,230,170,0.28), transparent)'},
  {bg: 'linear-gradient(165deg, #3a1f33 0%, #57263f 60%, #8a3a52 100%)', ink: '#fbeef0', sub: 'rgba(251,238,240,0.55)', name: 'Bloom', glow: 'radial-gradient(100px 60px at 30% 25%, rgba(255,170,190,0.3), transparent)'},
];

const TemplateCard: React.FC<{i: number}> = ({i}) => {
  const c = CARDS[i % CARDS.length];
  return (
    // 240px = the reference's card proportion (18.75% of frame width)
    <div style={{width: 240, height: 150, borderRadius: 10, overflow: 'hidden', position: 'relative', background: c.bg, boxShadow: '0 20px 44px rgba(16,22,38,0.3)', fontFamily: FONT.sans}}>
      {c.glow && <div style={{position: 'absolute', inset: 0, background: c.glow}} />}
      {/* mini site chrome: brand + pill nav */}
      <div style={{position: 'absolute', top: 9, left: 12, fontSize: 8.5, fontWeight: 600, letterSpacing: 0.6, color: c.sub}}>{c.name.toUpperCase()}</div>
      <div style={{position: 'absolute', top: 8, right: 10, display: 'flex', gap: 4}}>
        <span style={{width: 30, height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.22)', border: '0.5px solid rgba(255,255,255,0.25)'}} />
        <span style={{width: 10, height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.22)', border: '0.5px solid rgba(255,255,255,0.25)'}} />
      </div>
      {/* the hero: big serif display name, like the reference sites */}
      <div style={{position: 'absolute', left: 12, bottom: 34, fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: c.ink, letterSpacing: 0.4}}>{c.name}</div>
      <div style={{position: 'absolute', left: 13, bottom: 22, fontSize: 7.5, color: c.sub, letterSpacing: 0.3}}>Handcrafted stays, told with light.</div>
      {/* CTAs bottom-right */}
      <div style={{position: 'absolute', right: 10, bottom: 10, display: 'flex', gap: 4}}>
        <span style={{padding: '3px 8px', borderRadius: 7, fontSize: 7, fontWeight: 600, background: 'rgba(255,255,255,0.92)', color: '#1a1e28'}}>Browse</span>
        <span style={{padding: '3px 8px', borderRadius: 7, fontSize: 7, fontWeight: 600, background: 'rgba(255,255,255,0.2)', color: c.ink, border: '0.5px solid rgba(255,255,255,0.3)'}}>Tour</span>
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
      cursor={(t, pressing) => <MacCursor land={{x: 676, y: 396}} t={t} from={{x: 1150, y: 640}} press={pressing} size={44} />}
    />
  </div>
);
