import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {EASE, lerp} from '../lib/ease';
import {FONT} from '../lib/fonts';

/* ============================================================================
 * JUMP-ZOOM TYPE — a sentence on a leftward conveyor, told through camera jumps.
 *
 * STATUS: TEMPLATE UNDER REVIEW, round 3 (round-2 notes: exit travel 3x too far, swap
 * zoom was letter-shape bias, words enter from the LEFT, velocity steps smoothed).
 * Round 1 missed the defining motion: it tracked bbox height/cy only, called the
 * holds "dead still", and invented a 1.75×→1 shrink on the swap line. Round 2
 * re-measured the reference (per-frame text-only component tracking, x0/cx/capH,
 * 1080p 30fps → values here are ×2 frames, ×2/3 px for 720p):
 *
 *   THE CONVEYOR    every text object slides LEFT its whole life. It ENTERS
 *                   decelerating (climax glides ~200px to rest; a fresh line is
 *                   already moving ~5px/f), CREEPS left through the hold
 *                   (~2.5px/f at 1080p — never static; segment 2 overshoots and
 *                   relaxes back ~12px), and EXITS by accelerating left
 *                   (3→16px/f over ~10f) into a HARD CUT while still fully on
 *                   screen — the short-throw law on X, per line.
 *   JUMP-CUT        the only hard scale event: macro → reading frame in ONE
 *                   frame (measured 0.46×). The macro phrase slides during its
 *                   hold and accelerates into the jump like any exit.
 *   ACCUMULATION    after the jump the line is left-anchored: existing words
 *                   hold their ground (plus the creep), new words attach on the
 *                   right every ~6f.
 *   MACRO SWAP      a new emphasised line replaces everything in 1 frame at
 *                   ~1.28× the reading size and then MICRO-ZOOMS IN ~+10%
 *                   across its life (measured capH 99→109) — growth, never
 *                   shrink. No entry fade: it lands whole.
 *   CLIMAX WIPE     the final word wipes on left→right (~22f at 60fps) WHILE
 *                   gliding left to rest, at ~1.9× with a +2% drift — no
 *                   overshoot anywhere (every scale approach is monotonic).
 *                   After it rests: the slow upward drift, the exit breath.
 *
 *   SIZE CONTRAST    the ruled phase pattern: BIG (macro open) -> small (the
 *                     accumulated line) -> BIG (swap) -> BIG if the final line is
 *                     one word (climax) / small if it carries several.
 *
 * TEMPLATE CONTRACT (block law): the motion table is locked — it is the
 * measurement. The line list (copy, emphasis, climax) is content, free per video.
 * ========================================================================== */

export type JZLine =
  | {kind: 'open'; head: string; tail: string[]}
  | {kind: 'swap'; head: string; tail: string[]}
  | {kind: 'climax'; word: string};

/* ── the measured motion table (60fps frames · 720p px) ──────────────────── */
export const JZ = {
  resolveIn: 10, // the macro head fades in (stand-in for the ignored glyph morph)
  macroHold: 34, // macro phrase rides the conveyor…
  macroScale: 2.2, // …at this scale (measured 212/98 ≈ jump 0.46×)
  appendEvery: 6, // a new word lands every…
  appendIn: 8, // …settling with fade + 18px rise
  wideHold: 40, // completed line reads (creeping all the while)
  swapScale: 1.8, // a swap line is BIG (the ruled size-contrast pattern: big -> small ->
  // big -> BIG-if-one-word / small-if-more), CONSTANT for its whole life — the earlier
  // "+10% micro-zoom" was measurement bias (descenders raise median component height)
  climaxScale: 1.9, // the climax word's size — CONSTANT (no drift, no lift; ruled)
  climaxJump: 40, // the wipe SNAPS to this % instantly (the snap law), then eases the rest
  climaxWipe: 20, // …over this many frames
  climaxGlide: 36, // the decelerating entry glide…
  climaxGlideDist: 130, // …covering this many px to rest
  climaxHold: 34, // final hold
  // the conveyor (re-measured after review: totals, not just rates — the exit moves
  // ~30px ALL-IN at 720p including creep; the first cut moved 3x too far)
  creep: 1.0, // px/f leftward, all holds
  enterGlide: 14, // a fresh line decelerates over this many frames…
  enterDist: 18, // …covering this px beyond the creep
  relax: 5, // the overshoot-relax: glides this far past rest, eases back gently
  exitF: 20, // every non-final line's last frames accelerate left…
  exitDist: 26, // …adding this much BEYOND the creep — a visible lean, cut at ~-6px/f
} as const;

const lineDur = (ln: JZLine, last: boolean): number => {
  if (ln.kind === 'open') return JZ.resolveIn + JZ.macroHold + ln.tail.length * JZ.appendEvery + JZ.appendIn + JZ.wideHold + (last ? 0 : JZ.exitF);
  if (ln.kind === 'swap') return ln.tail.length * JZ.appendEvery + JZ.appendIn + JZ.wideHold + (last ? 0 : JZ.exitF);
  return Math.max(JZ.climaxWipe, JZ.climaxGlide) + JZ.climaxHold;
};

/** Total frames for a line list — derived from the table, never hand-typed. */
export const jzFrames = (lines: JZLine[]): number => lines.reduce((n, ln, i) => n + lineDur(ln, i === lines.length - 1), 0);

/** The conveyor: x-offset of a line at local frame `t`.
 *  enter (decelerating, still moving) → creep (with overshoot-relax) → exit accel. */
const conveyorX = (t: number, dur: number, hasExit: boolean, hasEnterGlide: boolean): number => {
  let x = 0;
  if (hasEnterGlide) {
    const g = lerp(t, [0, JZ.enterGlide], [0, 1], EASE.out);
    x += (1 - g) * JZ.enterDist - g * JZ.relax; // decelerate through rest into the overshoot…
    x += lerp(t, [JZ.enterGlide, JZ.enterGlide + 24], [0, JZ.relax], EASE.inOut); // …and relax back
  }
  x -= JZ.creep * t; // the ever-present creep
  if (hasExit) {
    const e0 = dur - JZ.exitF;
    x -= lerp(t, [e0, dur], [0, JZ.exitDist], EASE.in); // accelerate into the cut
  }
  return x;
};

/** A word fades in IN PLACE: layout is reserved from frame 0 (visibility, not mounting),
 *  so the centred line never re-flows — the reference accumulates left-anchored, x0 dead
 *  steady while x1 grows. Mount-on-time was measured in our own render as −117px jolts. */
const Word: React.FC<{t: string; at: number; f: number}> = ({t, at, f}) => {
  const p = lerp(f, [at, at + JZ.appendIn], [0, 1], EASE.uiEnter);
  return (
    <span
      style={{
        display: 'inline-block',
        visibility: f < at ? 'hidden' : 'visible',
        opacity: p,
        transform: `translateX(${(1 - p) * 24}px)`, // words arrive from the RIGHT, sliding left into their slot
        whiteSpace: 'pre',
      }}
    >
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
}> = ({lines, fontSize = 60, color = '#14161c', fontFamily = FONT.sans, fontWeight = 700}) => {
  const f = useCurrentFrame();

  let t = 0;
  let active: {line: JZLine; local: number; last: boolean} | null = null;
  for (let i = 0; i < lines.length; i++) {
    const dur = lineDur(lines[i], i === lines.length - 1);
    if (f < t + dur || i === lines.length - 1) {
      active = {line: lines[i], local: f - t, last: i === lines.length - 1};
      break;
    }
    t += dur;
  }
  const {line, local, last} = active!;
  const dur = lineDur(line, last);

  let scale = 1;
  let x = 0;
  let y = 0;
  let node: React.ReactNode = null;

  if (line.kind === 'open') {
    const macroEnd = JZ.resolveIn + JZ.macroHold;
    if (local < macroEnd) {
      // macro: big, riding the conveyor, accelerating into the jump like any exit
      const a = lerp(local, [0, JZ.resolveIn], [0, 1], EASE.out);
      scale = JZ.macroScale;
      x = -JZ.creep * local - lerp(local, [macroEnd - 14, macroEnd], [0, 16], EASE.in);
      node = <span style={{opacity: a}}>{line.head}</span>;
    } else {
      // ONE-step jump-cut to the reading frame; the line accumulates while creeping
      const lt = local - macroEnd;
      scale = 1;
      x = conveyorX(lt, dur - macroEnd, !last, true);
      node = (
        <>
          <span style={{whiteSpace: 'pre'}}>{line.head} </span>
          {line.tail.map((w, i) => (
            <Word key={i} t={i < line.tail.length - 1 ? `${w} ` : w} at={i * JZ.appendEvery} f={lt} />
          ))}
        </>
      );
    }
  } else if (line.kind === 'swap') {
    // lands whole in 1 frame at swapScale, CONSTANT, riding the conveyor
    scale = JZ.swapScale;
    x = conveyorX(local, dur, !last, false);
    node = (
      <>
        <span style={{whiteSpace: 'pre'}}>{line.head} </span>
        {line.tail.map((w, i) => (
          <Word key={i} t={i < line.tail.length - 1 ? `${w} ` : w} at={JZ.appendEvery + i * JZ.appendEvery} f={local} />
        ))}
      </>
    );
  } else {
    // climax: the wipe SNAPS to climaxJump% on frame one and eases the rest (the snap law),
    // WHILE gliding left to rest. Scale constant; no lift.
    const wipe = lerp(local, [0, JZ.climaxWipe], [JZ.climaxJump, 112], EASE.out);
    const glide = lerp(local, [0, JZ.climaxGlide], [0, 1], EASE.out);
    scale = JZ.climaxScale;
    x = (1 - glide) * JZ.climaxGlideDist;
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
          transform: `translate(${x}px, ${y}px) scale(${scale})`,
          whiteSpace: 'nowrap',
        }}
      >
        {node}
      </div>
    </AbsoluteFill>
  );
};
