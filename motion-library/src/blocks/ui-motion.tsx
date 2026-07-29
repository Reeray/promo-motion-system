import {Block} from './types';
import {ChipTokenize, LogTheater, LogTheaterZoomed, CameraPush} from '../clips/C';
import {LogoEndingSurface, ENDING_FRAMES} from '../promo/surfaces/hf-logo-ending';

/* UI-motion blocks (GPT-5.5 house standard) — same Block shape as the typography and
 * transition sets.
 *
 * These used to live in site/main.tsx, which meant the *website* owned part of the block
 * catalog: nothing under src/ could discover them, and adding a UI block meant editing the
 * presentation layer. The library owns its own inventory now; the site is a consumer. */
export const UI_BLOCKS: Block[] = [
  {
    name: 'chip-tokenize',
    category: 'ui',
    source: 'C · GPT-5.5',
    poster: 56,
    desc: 'A typed @-mention converts in place into a colored tool chip ~0.1s after the word completes; typing continues around it.',
    Comp: ChipTokenize,
  },
  {
    name: 'log-theater',
    category: 'ui',
    source: 'C · GPT-5.5',
    poster: 66,
    desc: 'Agent work as an accumulating checklist with app icons; the “Using X” header swaps as tools change; “Thinking” shimmers.',
    Comp: LogTheater,
  },
  {
    name: 'log-theater-zoomed',
    category: 'ui',
    source: 'C · GPT-5.5',
    poster: 70,
    desc: 'The same log framed as a static macro crop — the window is bigger than the viewport, pinned to the top-left; the feed auto-scrolls inside.',
    Comp: LogTheaterZoomed,
  },
  {
    name: 'camera macro-push',
    category: 'ui',
    source: 'C · GPT-5.5',
    poster: 50,
    desc: 'The viewport pushes in ~1.6× over ~0.5s to showcase a hero component — strong ease-out that decelerates into the hold, no overshoot.',
    Comp: CameraPush,
  },
  {
    name: 'hf-logo-ending',
    category: 'ui',
    source: 'HF logo intro · driving',
    poster: 46, // logo mid-overshoot — the money frame
    durationInFrames: ENDING_FRAMES,
    fps: 60,
    wide: true,
    desc: 'The brand resolve that closes every promo: the four product icons hold a two-beat silence, squeeze 55% toward centre (easeInCubic, no fade), then hard-cut into the HF logo landing its own downbeat with one ~3% overshoot. The third accent version ("driving") of the HF logo intro, final two keyframes.',
    Comp: LogoEndingSurface,
  },
];
