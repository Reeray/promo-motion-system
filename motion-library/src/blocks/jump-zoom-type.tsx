import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../lib/ease';
import {FONT} from '../lib/fonts';

/* ============================================================================
 * JUMP-ZOOM TYPE — a sentence told through camera jumps.
 *
 * STATUS: TEMPLATE UNDER REVIEW.
 * Measured frame-by-frame (ink-bbox tracking, 30fps source ×2 → 60fps) from the
 * "What if your cold emails didn't need you anymore" reference (G76Vjz7sqi2mbxdg.mp4,
 * first 3.5s). The glyph-morph resolve and gradient colour of the source are out of
 * scope by request — this template captures the CAMERA behaviour and text entry only:
 *
 *   MACRO OPEN      the first phrase holds at ~2.3× reading scale, dead still
 *                   (measured: bbox 225→225 over 17 src frames — zero zoom during
 *                   the hold; stillness is the anticipation).
 *   JUMP-CUT OUT    ONE step, no glide (measured 0.43× between adjacent frames):
 *                   the camera cuts to the wide sentence frame; the phrase becomes
 *                   the line start and the remaining words APPEND ~every 3 src
 *                   frames, centred as a growing line.
 *   MACRO SWAP      the next emphasised phrase REPLACES the line at macro scale
 *                   (hard swap ≤3 src frames), its tail words append while the
 *                   whole line settles OUT ~0.7× over ~8 src frames (ease-out) to
 *                   reading size.
 *   CLIMAX WIPE     the final word enters at the largest scale with a hard
 *                   left-to-right wipe (measured width 99→1530 over 11 src
 *                   frames), overshoots ~1.08 and settles in ~6, then holds with
 *                   a slow upward DRIFT (−1.6px/f at 1080p) — the exit breath.
 *
 * TEMPLATE CONTRACT (block law): the TIMING TABLE below is locked — it is the
 * measurement. The line list (copy, which phrase is macro, which word is the
 * climax) is content, free per video.
 * ========================================================================== */

export type JZLine =
  | {kind: 'open'; head: string; tail: string[]}
  | {kind: 'swap'; head: string; tail: string[]}
  | {kind: 'climax'; word: string};

/* ── the measured timing table (60fps frames; source values ×2) ───────────── */
export const JZ = {
  resolveIn: 10, // the head fades/settles in at macro (stand-in for the ignored morph)
  macroHold: 34, // the macro phrase holds, dead still
  jumpCut: 2, // the out-jump: one step
  macroScale: 2.3, // macro vs reading size (measured 225/96)
  appendEvery: 6, // a new word lands every…
  appendIn: 8, // …and takes this long to settle (uiEnter: fade + 18px rise)
  wideHold: 40, // the completed line reads
  swapIn: 4, // macro-swap replaces the line this fast (hard)
  swapScale: 1.75, // the swap phrase's macro (measured ~1.7–2.0)
  settleOut: 16, // the swap line's glide down to reading size…
  settleFrom: 1.43, // …starting this much larger (measured ~1/0.7)
  climaxScale: 1.9, // the climax word's size vs reading (measured 246/130)
  climaxWipe: 22, // hard left→right reveal
  climaxOver: 1.08, // slight overshoot at the wipe's end…
  climaxSettle: 12, // …settling back over this long
  climaxHold: 30, // final hold…
  driftPerFrame: -1.5, // …with the slow upward drift (px/f at 720p-ish scale)
} as const;

/** Total frames for a line list — derived from the table, never hand-typed. */
export const jzFrames = (lines: JZLine[]): number => {
  let n = 0;
  for (const ln of lines) {
    if (ln.kind === 'open') n += JZ.resolveIn + JZ.macroHold + JZ.jumpCut + ln.tail.length * JZ.appendEvery + JZ.appendIn + JZ.wideHold;
    else if (ln.kind === 'swap') n += JZ.swapIn + ln.tail.length * JZ.appendEvery + JZ.settleOut + JZ.wideHold;
    else n += JZ.climaxWipe + JZ.climaxSettle + JZ.climaxHold;
  }
  return n;
};

const Word: React.FC<{t: string; at: number; f: number}> = ({t, at, f}) => {
  const p = lerp(f, [at, at + JZ.appendIn], [0, 1], EASE.uiEnter);
  if (f < at) return null;
  return (
    <span style={{display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * 18}px)`, whiteSpace: 'pre'}}>
      {t}
    </span>
  );
};

export const JumpZoomType: React.FC<{
  lines: JZLine[];
  fontSize?: number; // reading size of a settled line
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
}> = ({lines, fontSize = 64, color = '#14161c', fontFamily = FONT.sans, fontWeight = 700}) => {
  const f = useCurrentFrame();

  // walk the schedule to find the active line and its local clock
  let t = 0;
  let active: {line: JZLine; local: number; start: number} | null = null;
  let ended = 0;
  for (const line of lines) {
    const dur =
      line.kind === 'open'
        ? JZ.resolveIn + JZ.macroHold + JZ.jumpCut + line.tail.length * JZ.appendEvery + JZ.appendIn + JZ.wideHold
        : line.kind === 'swap'
          ? JZ.swapIn + line.tail.length * JZ.appendEvery + JZ.settleOut + JZ.wideHold
          : JZ.climaxWipe + JZ.climaxSettle + JZ.climaxHold;
    if (f < t + dur) {
      active = {line, local: f - t, start: t};
      break;
    }
    t += dur;
    ended++;
  }
  if (!active) active = {line: lines[lines.length - 1], local: f - (t - 1), start: t};

  const {line, local} = active;
  let scale = 1;
  let drift = 0;
  let node: React.ReactNode = null;

  if (line.kind === 'open') {
    const macroEnd = JZ.resolveIn + JZ.macroHold;
    if (local < macroEnd + JZ.jumpCut) {
      // macro: the head alone, big, DEAD STILL (the measured zero-zoom hold)
      const a = lerp(local, [0, JZ.resolveIn], [0, 1], EASE.out);
      scale = JZ.macroScale;
      node = <span style={{opacity: a}}>{line.head}</span>;
    } else {
      // after the ONE-step jump-cut: reading frame, the line accumulates
      const t0 = macroEnd + JZ.jumpCut;
      scale = 1;
      node = (
        <>
          <span style={{whiteSpace: 'pre'}}>{line.head} </span>
          {line.tail.map((w, i) => (
            <Word key={i} t={i < line.tail.length - 1 ? `${w} ` : w} at={t0 + i * JZ.appendEvery} f={local} />
          ))}
        </>
      );
    }
  } else if (line.kind === 'swap') {
    // the swap phrase REPLACES the previous line at macro — a HARD swap: the head lands at
    // full opacity on its first frame (the measured swap never shows an empty stage)
    const a = 1;
    const settleStart = JZ.swapIn + line.tail.length * JZ.appendEvery;
    scale =
      local < settleStart
        ? JZ.swapScale
        : lerp(local, [settleStart, settleStart + JZ.settleOut], [JZ.swapScale, 1], EASE.camera);
    node = (
      <>
        <span style={{opacity: a, whiteSpace: 'pre'}}>{line.head} </span>
        {line.tail.map((w, i) => (
          <Word key={i} t={i < line.tail.length - 1 ? `${w} ` : w} at={JZ.swapIn + i * JZ.appendEvery} f={local} />
        ))}
      </>
    );
  } else {
    // climax: hard left→right wipe at the biggest scale, overshoot, settle, drift
    const wipe = lerp(local, [0, JZ.climaxWipe], [0, 116], EASE.inOut); // % past full for the soft edge
    scale =
      local < JZ.climaxWipe
        ? lerp(local, [0, JZ.climaxWipe], [JZ.climaxScale * 0.94, JZ.climaxScale * JZ.climaxOver], EASE.out)
        : lerp(local, [JZ.climaxWipe, JZ.climaxWipe + JZ.climaxSettle], [JZ.climaxScale * JZ.climaxOver, JZ.climaxScale], EASE.camera);
    drift = Math.max(0, local - JZ.climaxWipe - JZ.climaxSettle) * JZ.driftPerFrame;
    node = <span style={{clipPath: `inset(-20% ${Math.max(0, 100 - wipe)}% -20% -8%)`}}>{line.word}</span>;
  }

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          fontFamily,
          fontWeight,
          fontSize,
          color,
          letterSpacing: -1.2,
          transform: `scale(${scale}) translateY(${drift / Math.max(0.001, scale)}px)`,
          whiteSpace: 'nowrap',
        }}
      >
        {node}
      </div>
    </AbsoluteFill>
  );
};
