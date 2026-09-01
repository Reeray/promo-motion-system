import React from 'react';
import {SplitShowcase} from '../blocks/split-showcase';
import {MacCursor} from '../blocks/pose3d';
import {FONT} from '../lib/palette';

/* ============================================================================
 * PHRASE-SPLIT SHOWCASE DEMO — placeholder manner throughout (ruled): the
 * phrase is placeholder copy and the elements are BLANK DEFAULT CARDS, so the
 * gallery reads the MOTION, not invented content. Fresh-clone safe.
 * ========================================================================== */

const BlankCard: React.FC = () => (
  <div
    style={{
      width: 240,
      height: 150,
      borderRadius: 10,
      background: '#ffffff',
      border: '1px solid rgba(16,22,38,0.1)',
      boxShadow: '0 20px 44px rgba(16,22,38,0.18)',
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
      pick={1}
      cursor={(t, pressing) => <MacCursor land={{x: 668, y: 388}} t={t} from={{x: 1150, y: 640}} press={pressing} size={44} />}
    />
  </div>
);
