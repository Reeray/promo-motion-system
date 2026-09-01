import React from 'react';
import {SplitShowcase} from '../blocks/split-showcase';
import {FONT} from '../lib/palette';

/* ============================================================================
 * PHRASE-SPLIT SHOWCASE DEMO — placeholder manner (ruled): placeholder copy,
 * GRAY-TONE blank default cards, no pick — the gallery reads the motion.
 * ========================================================================== */

const BlankCard: React.FC = () => (
  <div
    style={{
      width: 185,
      height: 116,
      borderRadius: 10,
      background: '#e8eaef',
      border: '1px solid rgba(16,22,38,0.08)',
      boxShadow: '0 20px 44px rgba(16,22,38,0.16)',
    }}
  />
);

export const SPLIT_DEMO_FRAMES = 168;

export const SplitShowcaseDemo: React.FC = () => (
  <div style={{background: '#fbfbfd'}}>
    <SplitShowcase
      left={<span style={{fontFamily: FONT.sans, fontSize: 58, fontWeight: 700, color: '#14161c', letterSpacing: -1}}>Your text</span>}
      right={<span style={{fontFamily: FONT.sans, fontSize: 58, fontWeight: 700, color: '#14161c', letterSpacing: -1}}>here.</span>}
      renderCard={() => <BlankCard />}
    />
  </div>
);
