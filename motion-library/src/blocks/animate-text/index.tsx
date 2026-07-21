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
