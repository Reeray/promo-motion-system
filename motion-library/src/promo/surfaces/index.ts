import React from 'react';
import type {CueKind} from '../sound-kinds';

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
  /** True when the surface IS the viewport (a macro crop pinned to the frame) rather than an
   *  object centred on the stage. Bleed surfaces are absolutely positioned, so the scene has to
   *  carry the transition transform on a full-size layer or their containing block collapses. */
  bleed?: boolean;
  /** Instants inside this surface worth hearing, in frames relative to the surface's OWN start.
   *  The surface stays opaque: it publishes TIMINGS, not editable internals, so a cue list cannot
   *  become a back door into the captured choreography. Derived from the surface's existing
   *  constants — never a second hand-typed list that can drift from the motion. */
  cues?: {at: number; kind: CueKind}[];
  Comp: React.FC;
};

import {RepositoriesSurface, SURFACE_FRAMES as HF_STORAGE_FRAMES} from './hf-storage-repositories';
import {ModelsSurface, SURFACE_FRAMES as HF_HARDWARE_FRAMES} from './hf-hardware-filter';
import {PresetChipsSurface, PresetCycleSurface, CHIPS_FRAMES, CYCLE_FRAMES, CHIPS_CUES, CYCLE_CUES} from './hf-token-presets';
import {
  NewSpaceSurface,
  AgentSurface,
  LiveSpace,
  NEW_SPACE_FRAMES,
  AGENT_LOG_FRAMES,
  LIVE_SPACE_FRAMES,
} from './hf-spaces-agents';
import {LogoEndingSurface, ENDING_FRAMES, ENDING_CUES} from './hf-logo-ending';
import {LogoIntroSurface, INTRO_FRAMES as LOGO_INTRO_FRAMES, INTRO_CUES as LOGO_INTRO_CUES} from './hf-logo-intro';

export const SURFACES: Record<string, Surface> = {
  'hf-storage-repositories': {
    id: 'hf-storage-repositories',
    label: 'HF · Settings › Repositories storage',
    frames: HF_STORAGE_FRAMES,
    Comp: RepositoriesSurface,
  },
  'hf-hardware-filter': {
    id: 'hf-hardware-filter',
    label: 'HF · Models filtered by hardware',
    frames: HF_HARDWARE_FRAMES,
    Comp: ModelsSurface,
  },
  'hf-token-preset-chips': {
    id: 'hf-token-preset-chips',
    label: 'HF · Token preset chips rise',
    frames: CHIPS_FRAMES,
    cues: CHIPS_CUES,
    Comp: PresetChipsSurface,
  },
  'hf-token-presets': {
    id: 'hf-token-presets',
    label: 'HF · Every token preset exercised',
    frames: CYCLE_FRAMES,
    bleed: true,
    cues: CYCLE_CUES,
    Comp: PresetCycleSurface,
  },
  'hf-spaces-new': {
    id: 'hf-spaces-new',
    label: 'HF · Create a new Space — AI agent setup',
    frames: NEW_SPACE_FRAMES,
    Comp: NewSpaceSurface,
  },
  'hf-spaces-agent-log': {
    id: 'hf-spaces-agent-log',
    label: 'HF · Coding agent builds the Space',
    frames: AGENT_LOG_FRAMES,
    bleed: true,
    Comp: AgentSurface,
  },
  'hf-spaces-live': {
    id: 'hf-spaces-live',
    label: 'HF · The Space is running',
    frames: LIVE_SPACE_FRAMES,
    Comp: LiveSpace,
  },
  'hf-logo-ending': {
    id: 'hf-logo-ending',
    label: 'HF · Logo ending (driving resolve)',
    frames: ENDING_FRAMES,
    // NOT bleed: a transparent centred composition — bleed made its transitions scale from the
    // top-left corner, and its old white card fought the hosting theme.
    cues: ENDING_CUES,
    Comp: LogoEndingSurface,
  },
  'hf-logo-intro': {
    id: 'hf-logo-intro',
    label: 'HF · Logo intro — the full piece (driving, 3s-ramp)',
    frames: LOGO_INTRO_FRAMES,
    cues: LOGO_INTRO_CUES,
    Comp: LogoIntroSurface,
  },
};

export const SURFACE_IDS = () => Object.keys(SURFACES);
