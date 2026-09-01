import React from 'react';
import {Ring3D, RING_ITEMS, RingItem} from '../blocks/ring3d';
import {FONT} from '../lib/palette';

/* ============================================================================
 * BURST3D-RING DEMO — generic gradient tiles orbit a headline on the angled
 * ring. Content is deliberately neutral (no captured assets: block demos must
 * render on a fresh clone); swap renderItem for real imagery per project.
 * ========================================================================== */

const HUES: [string, string][] = [
  ['#f6d365', '#fda085'],
  ['#a1c4fd', '#c2e9fb'],
  ['#84fab0', '#8fd3f4'],
  ['#fccb90', '#d57eeb'],
  ['#e0c3fc', '#8ec5fc'],
  ['#f093fb', '#f5576c'],
  ['#5ee7df', '#b490ca'],
  ['#c3cfe2', '#f5f7fa'],
  ['#fddb92', '#d1fdff'],
  ['#9890e3', '#b1f4cf'],
  ['#96e6a1', '#d4fc79'],
  ['#fda085', '#f6d365'],
  ['#8fd3f4', '#84fab0'],
];

const Tile: React.FC<{i: number; item: RingItem}> = ({i, item}) => (
  <div
    style={{
      width: item.size,
      height: item.size * (i % 3 === 0 ? 0.72 : 1),
      borderRadius: 10,
      background: `linear-gradient(135deg, ${HUES[i % HUES.length][0]}, ${HUES[i % HUES.length][1]})`,
      boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
    }}
  />
);

export const RING_DEMO_FRAMES = 300; // burst + a full lap and a quarter

export const Ring3DDemo: React.FC = () => (
  <div style={{background: '#0b0f17'}}>
    <Ring3D renderItem={(i, item) => <Tile i={i} item={item} />}>
      <span style={{fontFamily: FONT.sans, fontSize: 64, fontWeight: 700, color: '#fff', letterSpacing: -1}}>Everywhere now.</span>
    </Ring3D>
  </div>
);
