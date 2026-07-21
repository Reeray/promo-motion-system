import {Block} from './types';
import {TRANSITION_BLOCKS} from './transitions';
import {ANIMATE_TEXT_BLOCKS} from './animate-text';
import {UI_BLOCKS} from './ui-motion';

/* ============================================================================
 * THE BLOCK CATALOG — one import for every block in the library.
 *
 * Adding a block is: write it, register it in ITS OWN category file, done. Nothing else
 * needs editing — the gallery, the generated BLOCKS.md manifest and the drift gate all read
 * from here.
 *
 * `category` is the kind:
 *   transition — scene-to-scene glue, tagged intro / outro / full-tro
 *   typography — text animation, driven by a spec JSON
 *   ui         — product-UI motion treatments
 * ========================================================================== */

export type BlockGroup = {label: string; category: Block['category']; note: string; blocks: Block[]};

export const BLOCK_GROUPS: BlockGroup[] = [
  {label: 'Transition', category: 'transition', note: 'scene-to-scene glue', blocks: TRANSITION_BLOCKS},
  {label: 'Typography', category: 'typography', note: 'pixel-point/animate-text', blocks: ANIMATE_TEXT_BLOCKS},
  {label: 'UI motion', category: 'ui', note: 'GPT-5.5 house standard', blocks: UI_BLOCKS},
];

export const ALL_BLOCKS: Block[] = BLOCK_GROUPS.flatMap((g) => g.blocks);

export {TRANSITION_BLOCKS, ANIMATE_TEXT_BLOCKS, UI_BLOCKS};
export type {Block};
