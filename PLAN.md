# Next stage — live editing before render

Status: **planned, not started.** Phase 0 (packaging) is done and shipped.

The promos are hand-written `.tsx` today, so nothing can be edited without changing source.
This stage turns a promo into **data** — a JSON doc of scenes and block ids — rendered by one
generic composition, so the live preview and the final MP4 come from a single code path and
cannot drift.

---

## Architecture

A promo becomes `promo.doc.json`. One `<Promo>` composition renders it, so
`<Player inputProps={doc}>` and `remotion render Promo --props=doc.json` share one path.

Editing is narrow **by construction**: the doc can express copy, block ids and size/hold
tokens — and nothing else. There is no field for a frame, a millisecond, an easing or a
colour, so motion stays locked because it is unrepresentable, not because a rule says so.

```
AI: theme -> capture -> storyboard -> writes promo.doc.json      (no video yet)
AI: starts the editor, hands over the URL
YOU: live-edit copy, swap blocks, reorder
YOU: Confirm -> both gates -> remotion render -> MP4
```

`prepare(raw)` is the **only** place duration is computed. Neither `<Player>` nor
`<Composition>` may ever receive a raw doc — both consume `prepare()`'s output. This matters
because `@remotion/player` does **not** run `calculateMetadata`; the old promos got parity free
from a shared *constant*, and a shared *function* called at two sites can diverge.

Scene duration is **derived, never stored**, and floored at `intro + 2` frames. Measured:
`glide-in` needs 54 frames to land while the shortest scenes derive to 60, so a 9-frame throw
would start before the intro settled — inverting the throw-cut law.

---

## Editor UX — decided from an interactive wireframe

**Layout: timeline strip + scene rail ("Both").** The strip gives proportional pacing and makes
duration swings visible; the rail gives every scene equal room to edit regardless of length.
A pure timeline spends ~61% of its width on the one scene you cannot edit (the UI surface).

**Why the strip earns its place:** swapping a text animation changes scene length by up to
**3.3x** on the same copy (`shared-axis-y` 60f vs `bottom-up-letters` 200f). A list reports that
as a changed number; the strip shows the segment growing and shoving everything right. Every
swap candidate must therefore display its derived length, not just its name.

**Transitions are first-class objects, not fields.** A junction sits at each scene boundary and
is clickable in both strip and rail:

| Junction state | Renders as |
|---|---|
| pair matches a library full-tro | **one** block — `push-off-left + glide-in` = `axis-handoff`; `scale-up-cut + scale-pop-in` = `depth-handoff` |
| pair does not match | two halves, with an axis warning if they disagree |

Swapping the **whole full-tro** is the primary action and sets both halves, so the axis cannot
drift. Swapping a single half is the advanced path.

This resolves the axis-adjacency question: adjacency is a **warning on the junction**, not a hard
`validate()` error, because full-tro-first editing makes a mismatch something you must
deliberately construct. (The existing storage promo *has* such a mismatch — it exits
`push-off-left` (X) into `scale-pop-in` (Z).)

**Editable vs not**

| Editable | Not editable |
|---|---|
| text copy | timing, easing, stagger, travel distance |
| block swap (compatible only) | colours, font sizes |
| size / hold **tokens** | product-UI scene internals |
| scene order | |

---

## Phases

### Phase 1 — harden parity before building anything new
- **T1** transitions from frames to ms + `msToFrames`; hooks read `useVideoConfig().fps`.
  `transitions.tsx` bakes 60fps into `THROW_DUR=9` etc. while never consulting fps.
- **T2** delete the Google Fonts `<link>` from `site/index.html` — it makes the preview more
  forgiving than the render and masks a forgotten loader import.
- **T3** static gate R5: every `<SpecText>` in the render path must carry `color=` and
  `loop={false}`. The colour default is invisible on a dark stage; `loop` defaulting true runs
  the exit at the hardcoded 550ms hold and blanks the stage mid-scene. Neither is catchable by
  the pixel gate.
- **T4** export `ANIMATE_TEXT_EFFECTS` from the existing `animate-text/index.tsx`; delete the
  dead `catalog.json`. No codegen, no `import.meta.glob` (Vite-only; the Remotion bundle is
  webpack — a glob is exactly what would differ between the two builds).

### Phase 2 — PromoDoc, derived duration, one generic `<Promo>`
- **T5** `promo/schema.ts` — HOLD/SIZE tokens, INTRO/OUTRO tables with axis, normalize,
  validate. No zod: it is not a declared dependency here, and hand-rolling removes the
  `.default()`-on-one-path divergence hazard.
- **T6** `promo/prepare.ts` — `sceneFrames` with the intro floor; the single duration boundary.
- **T7** `promo/Promo.tsx` — the generic component; replaces the `TextObject` helper currently
  copy-pasted into three promo files.
- **T8** register the `Promo` composition with `calculateMetadata`; ship a sample doc.
- **T9** `scripts/check-doc-parity.mjs`, wired into `npm run check`.

### Phase 3 — prove parity against a real promo
- **T10** lift `RepositoriesPage` into `promo/surfaces/` as an opaque registry entry. Its
  pixel-extracted bar geometry stays hand-written and non-parameterised.
- **T11** author `docs/hf-storage.promo.json`; tune hold tokens.
- **T12** render old vs new; compare the four gate metrics, frame count and boundary stills.
  Expected to differ: total duration (old holds were hand-generous) and size quantisation.
- **T13** ✅ **done early** — `--expect-frames` in `check-render.py`.

### Phase 4 — the editor
- **T14** `/editor` page; `<Player>` driven only by `prepare()`. The raw doc must never reach
  the Player.
- **T15** timeline strip + scene rail; copy textarea, size/hold segmented controls, reorder,
  click-to-seek. **No numeric timing input anywhere in the UI.**
- **T16** swap pickers — text effects **and** junctions (see Editor UX above). Every candidate
  shows its derived length. Hover previews use `seekTo` in a rAF loop, never `play()`.
- **T17** save/load `docs/*.promo.json` via a dev-only Vite middleware; refuse to save invalid.

### Phase 5 — close the loop
- **T18** Render button: `npm run check` -> `remotion render` -> `check-render.py
  --expect-frames`. Any failure blocks the result.
- **T19** ✅ port the remaining promos to docs; delete the hand-written ones once each passes.
- **T20** ✅ write the editing rules into SKILL.md (§2.6).

**Phases 1–5 are complete.** Every promo in the repo is now a `docs/*.promo.json`; `src/promos/`
is gone and `Promo` is the only composition that renders video.

---

## T12 record — hand-written vs doc-driven (hf-storage)

Both renders pass all seven gate checks. Accepted deltas:

| | old (hand-written) | new (doc) | note |
|---|---|---|---|
| frames | 740 | 745 | +0.7%; per-scene within 11f |
| mean luminance | 17.35 | 18.57 | |
| blown pixels % | 0.01 | 0.01 | |
| legibility contrast % | 2.58 | 3.02 | |
| frame variance | 2.30 | 3.09 | |

The three moved metrics exceed the <5% bar I originally set, and the cause is **deliberate, not
drift**: in the doc every scene has an intro, whereas the hand-written promo's title card simply
appeared. More on-screen motion and more text-bearing frames raise contrast and variance exactly
as you'd expect. Scene midpoints are visually identical, and no boundary shows an empty stage that
the old render didn't also show.

Also fixed while porting: the original's **axis mismatch** (scene 2 exited `push-off-left` on X
into scene 3's `scale-pop-in` on Z). The doc sets scene 2's exit to `scale-up-cut`, so the
junctions now read X → Z → X — each internally consistent *and* alternating between handoffs,
satisfying both the adjacency law and the VARY law.

Token quantisation was accepted, not retuned: `long` hold lands the text scenes within 11 frames
of hand-authored, and the new `xl` token preserved the title/payoff size contrast.

Surfaces are exempt from the per-scene bounds — those exist to catch copy-driven balloon, and a
surface's 7.6s is its own measured choreography.

## T19 record — the four surfaces, old promo vs doc render

Sampled across each surface segment; mean absolute pixel difference, 0–255:

| surface | frames | diff | note |
|---|---|---|---|
| `hf-hardware-filter` | 590 | 0.00 / worst 0.58 | exact on most sampled frames |
| `hf-storage-repositories` | 450 | 0.31 / worst 1.07 | old scene cross-faded opacity; the doc glide does not |
| `hf-spaces-new` | 300 | 0.0001 | |
| `hf-spaces-agent-log` | 260 | 0.30 | full-bleed macro crop |
| `hf-spaces-live` | 160 | 0.0006 | |

Everything under ~1/255 is h.264 noise from differing GOP boundaries. Two structural fixes were
needed to get there, and both are now properties of the **surface**, not of whichever scene
mounts it:

- **`surfaces/frame.tsx`** — the 1180×650 stage box used to live in the promo's scene, so the
  doc path (which sized nothing) rendered at 1280×720 and the extraction stopped lining up. The
  box is what the layout was measured against, so the surface owns it.
- **`Surface.bleed`** — the agent-log surface *is* the viewport, not an object on it. Its
  absolutely positioned children collapse inside a shrink-to-fit transform div, so a bleed scene
  carries the transition transform on an `AbsoluteFill` instead.

Derived vs hand-authored length: hardware 941f vs 990f, agents 960f vs 960f. `HFSpacesPromo`
(the lone 30fps one, superseded by the agents promo) was deleted — open question 6 resolved.

## Backlog

**Swapping UI-motion blocks.** Product-UI scenes are opaque registry references — the
pixel-extracted chart geometry and typed-command choreography are deliberately fixed. Making
them swappable is not a doc edit: it needs the AI to rebuild the surface and re-run capture, so
it is a round-trip, not an in-editor action. Worth doing later; out of scope for this stage.

**Vertical / 9:16.** Every composition is 1280x720 and the amplitude budgets are stated in
absolute pixels, so even changing dimensions inherits motion tuned for another canvas.

**Publish the library as an npm package** so the skill can require a version instead of a
bootstrap clone. Natural once the block registry becomes a public API.

---

## Open questions

| # | Question | Status |
|---|---|---|
| 1 | axis adjacency — error or warning? | **resolved**: warning on the junction |
| 2 | doc-rebuilt storage promo will be shorter than 740f | **resolved**: 745f, accepted (T12) |
| 3 | three size tokens, or add `xl`? | **resolved**: `xl` added |
| 4 | editor as its own page or a gallery tab? | **resolved**: own page, timeline-major |
| 5 | saving needs a dev-only Vite middleware | **resolved**: `editorApi()` in `vite.config.ts` |
| 6 | keep `HFSpacesPromo` (the lone 30fps one)? | **resolved**: deleted in T19 |
| 7 | add/delete scenes in the editor? | recommend edit-only this stage |
| 8 | duration ceiling | recommend 20s total |
