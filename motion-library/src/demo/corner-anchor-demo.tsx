import React from 'react';
import {CAZ, CazState, CornerAnchorZoom} from '../blocks/corner-anchor-zoom';
import {MacCursor} from '../blocks/pose3d';
import {FONT} from '../lib/palette';

/* ============================================================================
 * CORNER-ANCHOR ZOOM DEMO — a generic settings window plays the round trip.
 *
 * The content is deliberately product-neutral (no real brand, plain domain text):
 * a "Workspace settings" page whose top-right control — Enable backups — is the
 * crop's whole motivation. Rest: the control reads Off. Crop: the cursor lands on
 * it and presses. Result: the same window back at rest, the control now On — the
 * delta is the shot.
 *
 * The cursor's stage-space landing point is MEASURED from a render still (the
 * measured-landings law): the button centre under the 60%-occupancy geometry.
 * ========================================================================== */

const INK = '#1a1e28';
const MUT = '#7a8394';
const BORDER = '#e3e6ec';

const Row: React.FC<{label: string; value: string; last?: boolean}> = ({label, value, last}) => (
  <div style={{display: 'flex', justifyContent: 'space-between', padding: '13px 2px', borderBottom: last ? 'none' : `1px solid ${BORDER}`, fontSize: 14}}>
    <span style={{color: MUT}}>{label}</span>
    <span style={{color: INK, fontWeight: 500}}>{value}</span>
  </div>
);

const DemoWindow: React.FC<{s: CazState}> = ({s}) => {
  const on = s.done;
  return (
    <div style={{width: CAZ.winW, height: CAZ.winH, borderRadius: 12, overflow: 'hidden', background: '#fdfdfd', border: `1px solid ${BORDER}`, boxShadow: '0 24px 64px rgba(22,28,45,0.16), 0 3px 10px rgba(22,28,45,0.08)', fontFamily: FONT.sans, position: 'relative'}}>
      {/* browser chrome */}
      <div style={{display: 'flex', alignItems: 'center', gap: 10, height: 44, padding: '0 14px', background: '#f4f5f8', borderBottom: `1px solid ${BORDER}`}}>
        <div style={{display: 'flex', gap: 6}}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <span key={c} style={{width: 11, height: 11, borderRadius: '50%', background: c}} />
          ))}
        </div>
        <div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>
          <span style={{fontSize: 12.5, color: MUT, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '4px 46px'}}>example.com</span>
        </div>
        <span style={{width: 23}} />
      </div>

      {/* page */}
      <div style={{padding: '26px 34px', position: 'relative'}}>
        <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'}}>
          <div>
            <div style={{fontSize: 21, fontWeight: 700, color: INK}}>Workspace settings</div>
            <div style={{fontSize: 13.5, color: MUT, marginTop: 5}}>Storage, backups and retention</div>
          </div>
          {/* THE control — the crop's motivation, top-right */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              padding: '9px 16px',
              borderRadius: 9,
              fontSize: 13.5,
              fontWeight: 600,
              color: on ? '#fff' : INK,
              background: on ? '#16a34a' : '#fff',
              border: `1px solid ${on ? '#16a34a' : '#c9ced8'}`,
              boxShadow: s.pressing ? 'inset 0 2px 5px rgba(16,22,38,0.25)' : '0 1px 3px rgba(16,22,38,0.07)',
              transform: s.pressing ? 'scale(0.97)' : 'none',
            }}
          >
            <span style={{width: 15, height: 15, borderRadius: '50%', border: on ? '2px solid #fff' : `2px solid ${MUT}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}>
              {on && (
                <svg width={9} height={9} viewBox="0 0 10 10">
                  <path d="M1.5 5.2 L4 7.6 L8.5 2.4" stroke="#fff" strokeWidth="1.8" fill="none" />
                </svg>
              )}
            </span>
            {on ? 'Backups on' : 'Enable backups'}
          </div>
        </div>

        <div style={{marginTop: 24, borderTop: `1px solid ${BORDER}`}}>
          <Row label="Plan" value="Team" />
          <Row label="Storage used" value="184 GB of 1 TB" />
          <Row label="Retention window" value={on ? '30 days' : '—'} />
          <Row label="Last backup" value={on ? 'Just now' : 'Never'} last />
        </div>
      </div>
    </div>
  );
};

/** Stage-space cursor landing: the Enable-backups button centre under the crop
 *  geometry — verified from a render still, per the measured-landings law. */
const LAND = {x: 788, y: 318};

export const CornerAnchorZoomDemo: React.FC = () => (
  <div style={{background: '#f6f7f9'}}>
    <CornerAnchorZoom
      window={(s) => <DemoWindow s={s} />}
      cursor={(t, pressing) => <MacCursor land={LAND} t={t} from={{x: -420, y: 560}} press={pressing} size={44} />}
    />
  </div>
);
