import React from 'react';

/* ============================================================================
 * PRODUCT-UI SURFACES — opaque, non-editable, measured length.
 *
 * A surface is a hand-written React component referenced by id. Its internals are
 * deliberately NOT parameterised: the pixel-extracted chart geometry, the per-state
 * captured data and the typed-command choreography were measured from the real product
 * (SKILL §3c/§3e), and exposing them as doc fields would invite exactly the eyeballed
 * drift that work eliminated.
 *
 * So: TEXT becomes data, PRODUCT UI does not. The editor shows a surface scene as fixed
 * and says so plainly rather than implying it can be edited. Swapping one surface for
 * another is a backlog item that needs the agent to re-run capture and rebuild the
 * component — a round trip, not an in-editor action.
 *
 * `frames` is the surface's own measured length and is what prepare() uses for the scene
 * body; a surface owns its pacing because its internal choreography is keyed to it.
 * ========================================================================== */

export type Surface = {
  id: string;
  label: string;
  /** Measured length of the surface's internal choreography, in frames at 60fps. */
  frames: number;
  Comp: React.FC;
};

import {RepositoriesPage, SURFACE_FRAMES as HF_STORAGE_FRAMES} from './hf-storage-repositories';

export const SURFACES: Record<string, Surface> = {
  'hf-storage-repositories': {
    id: 'hf-storage-repositories',
    label: 'HF · Settings › Repositories storage',
    frames: HF_STORAGE_FRAMES,
    Comp: RepositoriesPage,
  },
};

export const SURFACE_IDS = () => Object.keys(SURFACES);
