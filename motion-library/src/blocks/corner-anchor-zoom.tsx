import React from 'react';
import {useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../lib/ease';
import {T} from './transitions';

/* ============================================================================
 * CORNER-ANCHOR ZOOM — the corner-anchored crop law, packaged as one round trip:
 *
 *   regular browser window  →  anchored macro crop (click)  →  regular window
 *
 * STATUS: ADMITTED (ui family, regular cell). The block canonizes the framing at
 * 60% OCCUPANCY (the promo's own crops ride their doc-tuned margins; the block is
 * the teachable constant): the scaled window's ANCHOR CORNER sits INSIDE the frame
 * with a stage margin — the stage, the rounded corner and the elevation stay
 * visible, so it still reads as the floating window, now huge — and ONLY the two
 * opposite edges run off-frame. NO zoom animation: the crop is a framing reached
 * BY the transition (axis-handoff grammar), camera dead still.
 *
 * The laws it carries (all ruled on the hf-blog-editor promo):
 *   EXIT-ON-CLICK      the cursor is in flight until the press; the press lands
 *                      ~10f before the outro — the transition IS the click's
 *                      consequence; post-click idle is forbidden.
 *   MOMENTUM TAIL      no phase ever settles to zero velocity: each view's enter
 *                      decelerates into a residual leftward creep (the exit axis)
 *                      which the outro then accelerates away.
 *   MOTIVATED FRAMING  the crop exists because of the control it frames; the
 *                      content plays the interaction (press → state flip), and
 *                      the return view shows the changed state — the delta is
 *                      the shot.
 *
 * TEMPLATE CONTRACT: the timing table and crop geometry are locked (measured
 * grammar); the WINDOW CONTENT is free via render-prop — it receives the phase
 * and the pressed state and draws the same window in all three framings.
 * ========================================================================== */

export type CazState = {
  /** which framing is on screen */
  phase: 'rest' | 'crop' | 'result';
  /** true once the press has committed (content should show the flipped state) */
  done: boolean;
  /** press-down window (content may draw the control depressed) */
  pressing: boolean;
};

/* ── the locked table (60fps frames) ─────────────────────────────────────── */
export const CAZ = {
  rest: 48, // the window at rest before the dive
  glide: 54, // axis-handoff enter, both directions
  cursorIn: 10, // cursor flight begins (crop-local)
  cursorLand: 64, // …and lands
  press: 71, // press-down (crop-local); release +6
  crop: 90, // crop phase total — outro at 81 = press+10 (exit-on-click)
  result: 57, // the settled return view
  stageW: 1280,
  stageH: 720,
  winW: 1080,
  winH: 580,
  /** 60% occupancy, top-right anchor: visible (stageW−mx)×(stageH−my) ≈ 0.60·stage */
  marginX: 310,
  marginY: 150,
  zoom: 2.0, // the crop scale — large enough that left+bottom truly overflow
} as const;

export const CAZ_FRAMES = CAZ.rest + CAZ.crop + CAZ.result;

/** Where the block's three phases sit on the clock (exported for cue placement). */
export const cazPhaseAt = (f: number): CazState => {
  const inCrop = f >= CAZ.rest && f < CAZ.rest + CAZ.crop;
  const local = f - CAZ.rest;
  return {
    phase: f < CAZ.rest ? 'rest' : inCrop ? 'crop' : 'result',
    done: f >= CAZ.rest + CAZ.press + 2,
    pressing: inCrop && local >= CAZ.press && local < CAZ.press + 6,
  };
};

/** One view's conveyor: glide-in tail → creep → throw-out (the momentum grammar). */
const conveyor = (f: number, len: number, hasEnter: boolean, hasExit: boolean): number => {
  let x = 0;
  if (hasEnter) x += lerp(f, [0, CAZ.glide], [T.GLIDE_PX, 0], EASE.out);
  x -= f * T.CREEP_PX;
  if (hasExit && f >= len - 9) {
    x -= lerp(f, [len - 9, len], [0, T.THROW_PX], EASE.throwOut);
  }
  return x;
};

/** The block: three framings of ONE window, handed off on the X axis.
 *  `window` draws the browser window (fixed CAZ.winW×CAZ.winH box) for a state;
 *  `cursorLand` is the stage-space landing point of the crop's cursor tip. */
export const CornerAnchorZoom: React.FC<{
  window: (s: CazState) => React.ReactNode;
  cursor?: (t: number, pressing: boolean) => React.ReactNode;
}> = ({window: win, cursor}) => {
  const f = useCurrentFrame();
  const s = cazPhaseAt(f);

  if (s.phase === 'rest') {
    const x = conveyor(f, CAZ.rest, false, true);
    return (
      <div style={{width: CAZ.stageW, height: CAZ.stageH, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
        <div style={{transform: `translateX(${x}px)`}}>{win(s)}</div>
      </div>
    );
  }

  if (s.phase === 'crop') {
    const local = f - CAZ.rest;
    const x = conveyor(local, CAZ.crop, true, true);
    const curT = lerp(local, [CAZ.cursorIn, CAZ.cursorLand], [0, 1], EASE.inOut);
    return (
      <div style={{width: CAZ.stageW, height: CAZ.stageH, position: 'relative', overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, transform: `translateX(${x}px)`}}>
          {/* the anchored crop: top-right corner INSIDE the frame, left+bottom overflow */}
          <div style={{position: 'absolute', right: CAZ.marginX, top: CAZ.marginY, transformOrigin: '100% 0%', transform: `scale(${CAZ.zoom})`}}>
            {win(s)}
          </div>
        </div>
        {/* stage-layer cursor: the crop's transform never touches it (focus-dive law) */}
        {cursor && local >= CAZ.cursorIn && cursor(curT, s.pressing)}
      </div>
    );
  }

  const local = f - CAZ.rest - CAZ.crop;
  const x = conveyor(local, CAZ.result, true, false);
  return (
    <div style={{width: CAZ.stageW, height: CAZ.stageH, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
      <div style={{transform: `translateX(${x}px)`}}>{win(s)}</div>
    </div>
  );
};
