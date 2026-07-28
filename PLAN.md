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

# STAGE 2 — AUDIO

Synthesized SFX on derived timings, an optional user-supplied music bed, and an in-editor cue
editor. Locked with the user: SFX are **synthesized** (ours, committed — no third-party audio in
a public repo, works on a fresh clone); scope covers **transition + UI cues**; music is
**user-supplied only**, gitignored; sound is **ON by default** but never load-bearing.

## Measured facts this plan is built on

Verified by source-reading and measurement, not assumed. Several contradict the obvious approach.

| fact | consequence |
|---|---|
| `<Audio>` is a deprecated **alias of `<Html5Audio>`**; `@remotion/media` is NOT installed | use the installed component; adding a dep breaks fresh-clone |
| `Sequence` defaults **`durationInFrames = Infinity`** (`Sequence.js:22`) | a cue Sequence without an explicit length **never unmounts** |
| `shared-audio-tags.js:348` **throws** past `numberOfSharedAudioTags` (Player default **5**) | cumulative mounts crash the editor — this is a real crash, not a warning |
| Remotion forces **`-ac 2`**; mono→stereo upmix costs exactly **3.01 dB** (measured) | **synthesize STEREO.** Mono would make preview 3 dB louder than render — a preview==render violation |
| `amix` runs **`normalize=0`** — a straight sum, hard-clipped at s16 | the per-cue ceiling must budget N simultaneous cues; -6 dBFS is measurably too hot |
| `volume` may be a function of frame, but **`volume <= 0` deletes the asset** for those frames | fades must floor at an epsilon, never 0, or the track is silently truncated |
| `<Audio>` has **no `from` prop** | absolute placement requires a wrapping `<Sequence from={}>` |
| Audio is muxed by ffmpeg **after** all frames, from a frame-sorted asset array | audio is deterministic and **concurrency-independent** — drop it from the risk list |
| `renderStill` passes **`audioEnabled: false`** | stills have no audio; the still-vs-video determinism check cannot cover it |
| The bundled ffmpeg is a **stripped build**: no `volumedetect`, `astats`, `ebur128`, or `md5` muxer. Only **`loudnorm`** + **`silencedetect`**; muxers `adts`/`wav`/`null` | the meter must be built from `loudnorm -print_format json` (`input_tp`, `input_i`) and/or decode-to-WAV analysed with the **numpy already installed** for the pixel gate |
| `motion-library/out/` is **gitignored** — `git ls-files` returns 0 | there is no committed baseline; `/__render` also overwrites `out/<id>.mp4` **in place** |

## Phases

Ordering principle: **the measuring instrument before the thing measured.** Every later threshold
is expressed in the meter's units, so a wrong meter certifies the wrong thing — the same failure
that let a 40% blown-pixel threshold reject the house reference video.

### Phase A — capture the baseline, then build the meter (no audio added)
- **T21** Pin `remotion`/`@remotion/player`/`@remotion/cli`/`@remotion/google-fonts` to exact
  `4.0.490`; declare `@remotion/media-utils` explicitly. A caret range could land a version where
  `Audio` means something else.
- **T22** **Capture the pre-audio baseline FIRST.** Render all five docs, copy to a *tracked*
  path (`motion-library/fixtures/pre-audio/`), and record per-doc `durationInFrames`, ffprobe
  stream layout and video-stream sha256 in a PLAN record. Rationale: `out/` is gitignored and
  `/__render` overwrites in place, so the silent baseline is destroyed by the first Render click
  after Phase D — and three later tasks assert "frame count identical to the pre-audio render".
- **T23** Replace `vite.config.ts`'s string-accumulating `body()` with a **Buffer-based**
  `rawBody()` (byte cap + error handler); redefine `body()` on top of it. The current helper
  corrupts any binary upload.
- **T24** `check-render.py` gains an ffmpeg ladder mirroring the existing `_ffprobes()`, plus an
  audio meter built **only from what the stripped build has**: `loudnorm -print_format json` for
  true peak / integrated LUFS, and decode-to-WAV + numpy for peak, RMS and exact-silence.
- **T25** Gate **A3** `--expect-silent`: assert separately that an audio stream *exists* and that
  decoded `max|sample| == 0.0`, run against the T22 fixture. A real, green, non-vacuous gate
  before one byte of audio exists.
- **T26** **ABORT POINT — calibrate headroom before any WAV is authored.** Bench the real chain
  (`aformat=s16:48000 → atrim → volume → -ac 2 → amix normalize=0 → AAC 320k`) at N = 2, 3, 4 and
  measure dBTP. Derive `PEAK_CEIL_DBFS` and the budgets from that measurement; record the
  arithmetic. The ceiling is baked into every committed WAV, so a late answer means regenerating
  all seven.

**Exit:** `npm run check` green; A3 green on the committed fixture; the meter agrees with a
known-amplitude fixture within 0.05 dB by two independent routes; budgets recorded with their
arithmetic.

### Phase B — deterministic synthesis
- **T27** `scripts/gen-sfx.mjs` primitives: **16-bit STEREO** 48 kHz RIFF writer, seeded LCG
  noise, hand-rolled one-pole/biquad — no npm audio dependency. Plus one cue so the gates are
  non-vacuous on first commit.
- **T28** Import `THROW_MS`/`GLIDE_MS`/`SCALE_UP_MS`/`POP_MS` and `EASE` from the real source via
  the same esbuild-to-temp technique `check-doc-parity` already uses. Durations are never retyped.
- **T29** The four transition recipes, where **one ease drives both amplitude and timbre** — the
  sound accelerates the way the motion does. This is the rule that makes the feature belong to
  this repo rather than being generic sound design.
- **T30** The three UI cues (~60/180/90 ms) — **labelled INVENTED** in the generator docstring and
  the record, because nothing in the repo measures them. An unlabelled invented number reads as
  derived to the next agent and becomes load-bearing.
- **T31** Gates **B4** (regeneration byte-identical) and **B5** (no transcendental drift: explicit
  allow/deny list, since `Math.sin` is not IEEE-pinned across engines). Fallback if byte-identity
  proves flaky across Node majors: downgrade to a committed sha256 manifest.

**Exit:** seven stereo WAVs committed, every duration traceable to an imported constant or an
explicitly-labelled invented one, levels inside the T26 ceiling.

### Phase C — the cue model, proven duration-inert
- **T32** `Surface` gains `cues?: {at, kind}[]`, derived in `hf-token-presets.tsx` from its
  existing `SETTLE`/`DWELL`/`STARTS` — never duplicated. Surfaces stay opaque: they publish
  timings, not internals.
- **T33** `src/promo/sound.ts`: `cues(prepared): Cue[]`, headlessly importable. **`Cue` carries
  `len`** (frames, from the same imported ms constants — no audio decode, so `prepare()` stays
  audio-free). Split the budget in two: **`TAG_BUDGET`** (mount concurrency) and **`MIX_BUDGET`**
  (headroom). They are different quantities and must not certify each other.
- **T34** The optional `sound` block in `schema.ts`, with `nudge` in **milliseconds** clamped and
  quantised inside `normalize()` — the `clampFraming` pattern, so editor and CLI agree.
- **T35** Gate **P6**: strip `sound` *and* every surface `cues` array, re-prepare, require
  identical totals and per-scene frames. The mechanical licence for the `nudge` carve-out under
  NO DERIVED NUMBERS, mirroring P5. Plus **C1** (interval-overlap sweep against both budgets) and
  **A4** (referenced files exist).
- **T36** Exercise the schema on `docs/sample.promo.json`, including a music path that
  deliberately does not exist, so the warn-not-throw path is real. **A4 errors on a missing SFX,
  warns on missing music** — one rule would either reject a valid music-less doc or silently
  accept a broken cue.

**Exit:** P6 demonstrated *failing* when deliberately broken. No shipping doc declares `sound`.

### Phase D — render layer (the first phase `npm run check` alone cannot close)
- **T37** `<CueLayer>` as a sibling of `<Series>`, each cue
  `<Sequence from={cue.frame} durationInFrames={cue.len}>` — **never the Infinity default** — and
  `numberOfSharedAudioTags` set **in this same commit**, not later. Exit must include: open a doc
  in the editor and play to the end without a thrown error, plus a fixture at `TAG_BUDGET+1` that
  is *demonstrated* to throw.
- **T38** The music bed: one `<Html5Audio>` at frame 0, volume as a function of frame doing fades
  and cue-derived ducking, **floored at a documented epsilon** — never 0.
- **T39** Gates **A1** (presence) and **A2** (true peak ≤ -1.0 dBTP), measured on the encoded MP4.
- **T40** `npm run check:render:audio` — the repo's **first determinism gate of any kind**:
  render twice, require identical audio-stream hashes via `-map 0:a -c:a copy -f adts`. Not part
  of `npm run check` (it costs two renders); run at phase boundaries.

**Exit:** explicitly not closable by `npm run check` alone — requires a measured render.

### Phase E — editor geometry, with zero audio in the tree
- **T41** The dot rail as a sibling of `.ed-strip`, x **measured** from `seg.offsetLeft` (the
  timeline is flex-sized, so position cannot be computed from the model alone).
- **T42** Dot drag → `nudge`, following the `FramingStage` pattern verbatim: pointer capture,
  local live state, a mirroring **ref** for the pointerup read, scale locked at pointerdown.
- **T43** Fix the pre-existing bug where `setDirty(false)` runs regardless of save success.
- **T44** Static rule **R6**: the cue-frame derivation may not appear outside `sound.ts`.

**Exit:** placement correct at three widths and mid-junction-animation, verified after a
**genuine reload** (not HMR). A dot bug can never be confused with a sound bug.

### Phase F — editor audio: waveform, audition, upload
- **T45** `useCueAudio(src)` with an explicit `{state, buffer, error}` and an AudioContext cache.
- **T46** The popover mounted conditionally **from the parent** (hooks stay unconditional — this
  file has already crashed once that way), waveform via `getWaveformPortion`.
- **T47** ▶ plays a WebAudio one-shot. A click grants user activation — this does *not* violate
  the hover-preview law, and must be commented so a later agent doesn't "fix" it.
- **T48** `POST /__audio` on T23's raw reader, its own filename guard, validated by extension
  **and** by probing with ffprobe, written to gitignored `public/sfx/custom/`.

**Exit:** uploads round-trip byte-identically; a missing file warns and never throws at any layer.

### Phase G — tune, ship, write the laws
- **T49** A **fixed** number of listen-and-tune passes (3), each ending with all gates re-run.
  Scheduled, not assumed — no gate can judge whether it sounds good.
- **T50** Add `sound` to the four shipping docs and re-measure. Until here they carry an explicit
  `"sfx": "off"`, so turning sound on is **one deliberate switch** rather than a side effect of
  Phase D — and a failure is never ambiguous between the render layer and doc authoring.
- **T51** SKILL.md: revise §0.5 item 8 to on-by-default **but never load-bearing** (it must still
  read perfectly muted); add the law **SOUND FOLLOWS MOTION**; extend NO DERIVED NUMBERS with the
  `nudge` carve-out and its P6 proof.

## T26 record — headroom calibration (the Phase A abort point)

`scripts/bench-audio-headroom.mjs` replicates Remotion's real audio chain — per-asset
`-ac 2` → `amix=inputs=N:normalize=0` → AAC 320k — on 0.5 s 1 kHz bursts and measures true peak
with `loudnorm`. **Phase A did not abort**: a workable ceiling exists.

**1. The mono/stereo question is settled by measurement, not inference.**

| authored | through `-ac 2` | measured |
|---|---|---|
| mono, −6.02 dBFS | forced stereo upmix | **−9.03 dBTP** |
| stereo, −6.02 dBFS | no-op | **−6.02 dBTP** |

Mono costs exactly **3.01 dB**. The editor's `<Player>` up-mixes through Web Audio, which does a
straight copy — so mono assets would make **preview 3 dB louder than render**. That is a
preview≠render defect, not a quality preference. **SFX are authored STEREO (dual-mono).**

**2. The spec's −6 dBFS ceiling is measurably wrong.** `normalize=0` is a straight sum, so N
coincident cues add 20·log₁₀(N):

| authored | N=1 | N=2 | N=3 | N=4 |
|---|---|---|---|---|
| −6 dBFS | −5.97 | **+0.08** ✗ | **+0.27** ✗ | **+0.32** ✗ |
| −9 dBFS | −8.98 | −2.96 | **+0.10** ✗ | **+0.26** ✗ |
| −12 dBFS | −11.98 | −5.96 | −2.43 | **+0.10** ✗ |
| **−15 dBFS** | −14.99 | −8.96 | −5.43 | **−2.95** ✓ |

(dBTP after AAC. ✗ = over the −1.0 dBTP limit; the −6 dBFS row is over **full scale** at N=2.)

**3. AAC's transient overshoot is small here** — 0.01–0.17 dB, not the ~2.6 dB the plan assumed.
Worth correcting: the dominant term is the sum, not the codec.

**Derived constants** — arithmetic, so they move together if the budget changes:

```
PEAK_CEIL_DBFS = -15    # -1.0 (limit) - 12.04 (20·log10(4)) - 0.2 (AAC) = -13.24; -15 keeps ~1.8 dB spare
MIX_BUDGET     = 4      # max concurrent audio elements assumed by the ceiling
TAG_BUDGET     = 8      # numberOfSharedAudioTags. Player's DEFAULT IS 5 and it THROWS past it;
                        # 4 cues + 1 music bed is exactly 5, so the default has zero margin.
```

These are a **coherent-sum worst case** (identical signals). Real cues are different sounds and
sum incoherently at roughly +3 dB per doubling, so −15 dBFS is conservative by design.

## Open questions

| # | Question | Status |
|---|---|---|
| 1 | Per-cue peak ceiling | **resolved in T26**: −15 dBFS, measured |
| 2 | `TAG_BUDGET` / `MIX_BUDGET` | **resolved in T26**: 8 / 4 |
| 3 | A1's -40 dBFS floor is invented | keep as a *presence* check, record the measured actual beside it |
| 4 | LUFS as a gate | **measure and record every render, never gate** — a music-less doc measures -inf |
| 5 | Do the four promos get sound this stage? | yes, but as the last task, for the reason in T50 |

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

**Container morph as a native block** (raise this on the next container-morphing request).
T9 "element morph" is catalogued and never built. Build it NATIVELY, not with GSAP's Flip:
Flip's value is measuring geometry you don't know, and here we author both rects (the capture
already holds `cardWidth: 643`, `cardRadius: 12`). Flip also needs a "before" and an "after"
separated in time, which a frame renderer has nowhere to put — frames render independently and
out of order. Native recipe: interpolate `x/y/width/height/borderRadius` between two known rects
and cross-fade the contents, bringing content in only AFTER the container lands (the rule from
the `border-morph-transition` skill). Animate real width/height rather than scaling a fixed box —
the layout cost that makes browsers avoid it is irrelevant offline, and it removes child
distortion entirely.

**A determinism gate** — worth having regardless of the above. Every current gate measures ONE
finished file; "two renders are identical" has never been asserted. Three checks: render twice
and compare PNG frames (not MP4 — encoder variance muddies it), render at concurrency 1 vs 8,
and compare `remotion still --frame=N` against frame N of the full video. The third is the sharp
one: it catches any effect that secretly depends on frame-to-frame continuity.

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
