import React from 'react';
import {AbsoluteFill, Composition, Series, useCurrentFrame} from 'remotion';
import {lerp} from './lib/ease';
import {Labeled} from './lib/Labeled';
import {TypeOnHighlighter, CometPaint, AnchoredGrow, GhostWipe} from './clips/A';
import {DotBirth, QuantumBars, SwallowMorph, HoverIgnite, HeadlineSwap} from './clips/B';
import {ChipTokenize, LogTheater, DarkPayoffCut, CameraPush} from './clips/C';

const CLIP = 75; // 2.5s @ 30fps

const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const o1 = lerp(f, [4, 16], [0, 1]);
  const o2 = lerp(f, [14, 26], [0, 1]);
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      <div style={{fontSize: 52, fontWeight: 700, letterSpacing: -1, color: '#141419', opacity: o1}}>
        Promo Motion Reference Library
      </div>
      <div style={{fontSize: 24, color: '#8a8a92', marginTop: 16, opacity: o2}}>
        12 primitives · sources: [A] Prism promo · [B] jurni launch · [C] GPT-5.5 announce
      </div>
    </AbsoluteFill>
  );
};

const Library: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={60}>
      <Intro />
    </Series.Sequence>
    <Series.Sequence durationInFrames={CLIP}>
      <Labeled name="type-on + highlighter" source="A · Prism promo"><TypeOnHighlighter /></Labeled>
    </Series.Sequence>
    <Series.Sequence durationInFrames={CLIP}>
      <Labeled name="comet-paint" source="A · Prism promo"><CometPaint /></Labeled>
    </Series.Sequence>
    <Series.Sequence durationInFrames={CLIP}>
      <Labeled name="anchored-grow" source="A · Prism promo"><AnchoredGrow /></Labeled>
    </Series.Sequence>
    <Series.Sequence durationInFrames={CLIP}>
      <Labeled name="ghost-wipe" source="A · Prism promo"><GhostWipe /></Labeled>
    </Series.Sequence>
    <Series.Sequence durationInFrames={CLIP}>
      <Labeled name="dot-birth + palette-flood" source="B · jurni launch"><DotBirth /></Labeled>
    </Series.Sequence>
    <Series.Sequence durationInFrames={CLIP}>
      <Labeled name="quantum-bars" source="B · jurni launch"><QuantumBars /></Labeled>
    </Series.Sequence>
    <Series.Sequence durationInFrames={CLIP}>
      <Labeled name="swallow-morph" source="B · jurni launch"><SwallowMorph /></Labeled>
    </Series.Sequence>
    <Series.Sequence durationInFrames={CLIP}>
      <Labeled name="hover-ignite" source="B · jurni launch"><HoverIgnite /></Labeled>
    </Series.Sequence>
    <Series.Sequence durationInFrames={CLIP}>
      <Labeled name="headline-swap" source="B · jurni launch"><HeadlineSwap /></Labeled>
    </Series.Sequence>
    <Series.Sequence durationInFrames={CLIP}>
      <Labeled name="chip-tokenize" source="C · GPT-5.5 announce"><ChipTokenize /></Labeled>
    </Series.Sequence>
    <Series.Sequence durationInFrames={CLIP}>
      <Labeled name="log-theater" source="C · GPT-5.5 announce"><LogTheater /></Labeled>
    </Series.Sequence>
    <Series.Sequence durationInFrames={CLIP}>
      <Labeled name="dark-payoff cut" source="C · GPT-5.5 announce"><DarkPayoffCut /></Labeled>
    </Series.Sequence>
    <Series.Sequence durationInFrames={CLIP}>
      <Labeled name="camera macro-push · 1.6× / 0.5s" source="C · GPT-5.5 announce"><CameraPush /></Labeled>
    </Series.Sequence>
  </Series>
);

export const Root: React.FC = () => (
  <Composition
    id="MotionLibrary"
    component={Library}
    durationInFrames={60 + 13 * CLIP}
    fps={30}
    width={1280}
    height={720}
  />
);
