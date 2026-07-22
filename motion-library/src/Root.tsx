import React from 'react';
import {AbsoluteFill, Composition, Series, useCurrentFrame} from 'remotion';
import {lerp} from './lib/ease';
import {PX, FONT} from './lib/palette';
import {Labeled} from './lib/Labeled';
import {ChipTokenize, LogTheater, LogTheaterZoomed, CameraPush} from './clips/C';
import {HFSpacesPromo, HF_PROMO_DURATION} from './promos/HFSpaces';
import {ANIMATE_TEXT_BLOCKS} from './blocks/animate-text';
import {TRANSITION_BLOCKS} from './blocks/transitions';
import {HFSpacesAgentsPromo, HF_AGENTS_DURATION} from './promos/HFSpacesAgents';
import {HFHardwareFilterPromo, HF_HARDWARE_DURATION} from './promos/HFHardwareFilter';
import {HFStorageOverviewPromo, HF_STORAGE_DURATION} from './promos/HFStorageOverview';
import {Promo} from './promo/Promo';
import {prepare} from './promo/prepare';
import {PromoDocRaw} from './promo/schema';
import SAMPLE_DOC from '../docs/sample.promo.json';

const slug = (s: string) => 'at-' + s.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase();
const dur = (b: {durationInFrames?: number}) => b.durationInFrames ?? 75;

const CLIP = 75; // 2.5s @ 30fps

const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const o1 = lerp(f, [4, 16], [0, 1]);
  const o2 = lerp(f, [14, 26], [0, 1]);
  return (
    <AbsoluteFill style={{backgroundColor: PX.bg, justifyContent: 'center', alignItems: 'center', fontFamily: FONT.sans}}>
      <div style={{fontSize: 52, fontWeight: 700, letterSpacing: -1.5, color: '#141419', opacity: o1}}>
        Promo Motion — block library
      </div>
      <div style={{fontSize: 24, color: '#8a8a92', marginTop: 16, opacity: o2}}>
        GPT-5.5-school UI motion
      </div>
    </AbsoluteFill>
  );
};

const UI_CLIPS: {name: string; source: string; Comp: React.FC}[] = [
  {name: 'chip-tokenize', source: 'UI · GPT-5.5 house standard', Comp: ChipTokenize},
  {name: 'log-theater', source: 'UI · GPT-5.5 house standard', Comp: LogTheater},
  {name: 'log-theater · macro crop', source: 'UI · GPT-5.5 house standard', Comp: LogTheaterZoomed},
  {name: 'camera macro-push', source: 'UI · GPT-5.5 house standard', Comp: CameraPush},
];

const Library: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={60}>
      <Intro />
    </Series.Sequence>
    {UI_CLIPS.map((c) => (
      <Series.Sequence key={c.name} durationInFrames={CLIP}>
        <Labeled name={c.name} source={c.source}>
          <c.Comp />
        </Labeled>
      </Series.Sequence>
    ))}
  </Series>
);

// Faithful pixel-point/animate-text catalog reel (one loop of each effect).
const AnimateTextReel: React.FC = () => (
  <Series>
    {ANIMATE_TEXT_BLOCKS.map((b) => (
      <Series.Sequence key={b.name} durationInFrames={dur(b)}>
        <Labeled name={b.name} source={b.source}>
          <b.Comp />
        </Labeled>
      </Series.Sequence>
    ))}
  </Series>
);

export const Root: React.FC = () => (
  <>
    <Composition id="MotionLibrary" component={Library} durationInFrames={60 + UI_CLIPS.length * CLIP} fps={30} width={1280} height={720} />
    <Composition id="HFSpacesPromo" component={HFSpacesPromo} durationInFrames={HF_PROMO_DURATION} fps={30} width={1280} height={720} />
    <Composition id="HFAgentsPromo" component={HFSpacesAgentsPromo} durationInFrames={HF_AGENTS_DURATION} fps={60} width={1280} height={720} />
    <Composition id="HFHardwarePromo" component={HFHardwareFilterPromo} durationInFrames={HF_HARDWARE_DURATION} fps={60} width={1280} height={720} />
    <Composition id="HFStoragePromo" component={HFStorageOverviewPromo} durationInFrames={HF_STORAGE_DURATION} fps={60} width={1280} height={720} />
    {/* One generic composition for every PromoDoc. calculateMetadata is the ONLY place the raw
        doc is turned into Prepared — the component never sees a raw doc, and neither does the
        editor's <Player>. Duration is derived here, never hardcoded. */}
    <Composition
      id="Promo"
      /* The cast is the input/output boundary: defaultProps and --props are a RAW doc, while the
         component receives Prepared. calculateMetadata performs that transform, but Remotion
         infers defaultProps from the component's own prop type, so the two cannot both be
         expressed. Casting here keeps Promo strictly typed as React.FC<Prepared> — which is the
         property that matters, since a raw doc must never reach a renderer. */
      component={Promo as unknown as React.FC<PromoDocRaw>}
      defaultProps={SAMPLE_DOC as unknown as PromoDocRaw}
      calculateMetadata={({props}) => {
        const p = prepare(props as PromoDocRaw);
        return {
          durationInFrames: p.durationInFrames,
          fps: p.fps,
          width: p.width,
          height: p.height,
          props: p as unknown as PromoDocRaw,
        };
      }}
      fps={60}
      width={1280}
      height={720}
    />
    {ANIMATE_TEXT_BLOCKS.map((b) => (
      <Composition key={b.name} id={slug(b.name)} component={b.Comp} durationInFrames={dur(b)} fps={30} width={1280} height={720} />
    ))}
    {TRANSITION_BLOCKS.map((b) => (
      <Composition
        key={b.name}
        id={'tr-' + b.name}
        component={b.Comp}
        durationInFrames={dur(b)}
        fps={b.fps ?? 30}
        width={1280}
        height={720}
      />
    ))}
    <Composition
      id="AnimateTextReel"
      component={AnimateTextReel}
      durationInFrames={ANIMATE_TEXT_BLOCKS.reduce((n, b) => n + dur(b), 0)}
      fps={30}
      width={1280}
      height={720}
    />
  </>
);
