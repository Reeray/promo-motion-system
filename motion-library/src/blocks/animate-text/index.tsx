import React from 'react';
import {Block} from '../types';
import {Spec, SpecText, timeline, countUnits, RT} from './SpecText';
import samples from './samples.json';

// The 17 generic (non-layout-aware) effects from the pixel-point/animate-text website
// catalog, in catalog order. Specs are copied verbatim into ./specs/ — SpecText executes
// them directly. The 3 kinetic custom-renderer effects (kinetic-center-build,
// short-slide-right, short-slide-down) are layout-aware and handled separately.
import softBlurIn from './specs/soft-blur-in.json';
import perCharacterRise from './specs/per-character-rise.json';
import perWordCrossfade from './specs/per-word-crossfade.json';
import springScaleIn from './specs/spring-scale-in.json';
import maskRevealUp from './specs/mask-reveal-up.json';
import lineByLineSlide from './specs/line-by-line-slide.json';
import typewriter from './specs/typewriter.json';
import microScaleFade from './specs/micro-scale-fade.json';
import shimmerSweep from './specs/shimmer-sweep.json';
import fadeThrough from './specs/fade-through.json';
import sharedAxisY from './specs/shared-axis-y.json';
import sharedAxisZ from './specs/shared-axis-z.json';
import blurOutUp from './specs/blur-out-up.json';
import scaleDownFade from './specs/scale-down-fade.json';
import focusBlurResolve from './specs/focus-blur-resolve.json';
import bottomUpLetters from './specs/bottom-up-letters.json';
import topDownLetters from './specs/top-down-letters.json';

const RAW: unknown[] = [
  softBlurIn, perCharacterRise, perWordCrossfade, springScaleIn, maskRevealUp,
  lineByLineSlide, typewriter, microScaleFade, shimmerSweep, fadeThrough,
  sharedAxisY, sharedAxisZ, blurOutUp, scaleDownFade, focusBlurResolve,
  bottomUpLetters, topDownLetters,
];

const FPS = 30;
const fontFor = (s: string) => (s.includes('\n') ? 50 : s.length > 22 ? 46 : 60);

const toBlock = (raw: unknown): Block => {
  const spec = raw as Spec;
  const sample = (samples as Record<string, {sample: string}>)[spec.id].sample;
  const n = countUnits(sample, spec.target);
  const tl = timeline(spec, n);
  const fontSize = fontFor(sample);
  return {
    name: spec.id,
    category: 'typography',
    source: 'animate-text',
    desc: spec.description,
    poster: Math.max(1, Math.round(((tl.enterTotal + RT.hold * 0.4) / 1000) * FPS)),
    durationInFrames: Math.max(30, Math.ceil((tl.cycle / 1000) * FPS)),
    Comp: () => <SpecText spec={spec} sample={sample} fontSize={fontSize} />,
  };
};

export const ANIMATE_TEXT_BLOCKS: Block[] = RAW.map(toBlock);

/* ── The registry the PromoDoc layer and the editor's swap picker consume ────────────────────
 * Built from the same RAW array that produces the gallery blocks, so the two can never disagree.
 * No codegen script and no import.meta.glob: glob is Vite-only while the Remotion bundle is
 * webpack, making it the one construct that would silently differ between the gallery build and
 * the render build — the exact class of bug this project keeps getting bitten by.
 *
 * This is also where `display_name` finally survives: it is read into the Spec type above and then
 * thrown away by toBlock(), which is why nothing could show a human label for an effect. */
export type TextEffect = {id: string; label: string; spec: Spec};

export const ANIMATE_TEXT_EFFECTS: TextEffect[] = RAW.map((raw) => {
  const spec = raw as Spec;
  return {id: spec.id, label: spec.display_name ?? spec.id, spec};
});

export const TEXT_EFFECT_IDS: string[] = ANIMATE_TEXT_EFFECTS.map((e) => e.id);
