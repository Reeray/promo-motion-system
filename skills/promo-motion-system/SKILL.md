---
name: promo-motion-system
description: Reusable motion-design system for AI/tech product promo and brand-launch videos, organized by EFFORT TIER (quick / medium / high) with all three tiers grounded in frame-by-frame studied references — [A] Prism AI tutorial (QUICK feature promo), [C] "Introducing GPT-5.5" OpenAI-school (MEDIUM capability announcement, the house standard), [B] jurni brand launch (HIGH). Three storyboard blueprints, 15-transition catalog, 40+ named motion primitives, typography and chip-emphasis rules, zoom choreography, measured timing charts, per-tier amplitude budgets, and design tokens. On invocation, ASK which tier the user wants, then route. Use when making a product/feature/model release promo, launch video, teaser, brand reveal, motion graphic, kinetic typography piece, or when storyboarding any announcement video. Triggers on "promo video", "launch video", "brand launch", "release announcement", "motion graphics", "storyboard", "kinetic type".
---

# Promo Motion System — "Structure > Visuals"

Extracted frame-by-frame (with per-frame motion-energy profiling to fingerprint easing) from
reference videos. Core thesis: **motion sells the story** — every animation advances the
narrative, directs the eye, or bridges scenes. Nothing moves just to be pretty.

## 0 · ROUTING — always do this first

Unless the user already said so, **ask which tier of promo they want**, then apply that
tier's blueprint, pacing, and production depth:

| Tier | Exemplar | Character | Scope |
|---|---|---|---|
| **QUICK** | [A] Prism AI (26.5s) | 4-act feature promo, one signature motif, restrained scenes, fast to produce | ~25–35s, 1 signature energy motif, simple 2D stage + light 3D drift |
| **MEDIUM** *(house standard)* | [C] "Introducing GPT-5.5" (55s, OpenAI school) | capability announcement: white-void stage, typed titles, demo trilogy with claim interstitials, chip-tokenized prompts, log theater, amplitude discipline (the quietest motion of the three tiers) | ~40–60s, zero decorative motifs, content-driven motion only |
| **HIGH** | [B] jurni launch (54.8s) | 7-act brand launch, motion physics derived from the logomark, zoom-choreographed demo, canvas world, bookend identity | ~45–60s, full brand derivation + macro set pieces |

Locked project decisions: **16:9 landscape** (X/YouTube) is the default format. Production
path is **Remotion** — pair this skill (design/storyboard layer) with the
`feature-promo-animation` skill (build/render layer).

**Tier intuition:** effort ≠ motion amplitude. [C] (house standard) is the *calmest* — its
effort goes into UI fidelity and demo storytelling, not flourish. Amplitude ranking:
B (loudest) > A > C (quietest). Duration ranking: B ≈ C > A.

## 0.5 · INTAKE — scope the video before designing anything

After tier, collect these (use AskUserQuestion where the choices are enumerable; accept
"decide for me" and apply the noted default). Do not skip intake unless the user has
already answered these in their brief.

1. **Subject** — what exactly is being announced (product/feature/model name) and its
   one-line function. *No default; required.*
2. **The One Claim** — if the viewer remembers a single sentence, what is it? Becomes the
   thesis title ([C]) or the recap kinetic line ([A]). *Required; offer to draft 3 options.*
3. **Demoable moments** — what can actually be shown? For MEDIUM: candidates for the
   toy / work / money trilogy. Note for each: real UI available (replicate precisely — use
   `live-page-replica`) vs mock to design. *Required for any tier with demo acts.*
4. **Brand kit** — logo/mark (its construction seeds the motion physics per §2), palette,
   font. *Default: neutral white-void + ink, chips as accent ([C] tokens).*
5. **Audience & platform** — who watches, where it ships. *Default: technical audience,
   X/YouTube 16:9.*
6. **Duration ceiling** — hard cap if any. *Default: tier norm (A ~30s, C ~50s, B ~55s).*
7. **Ending** — CTA URL / availability line / plain logo hold, and loop-ready or not.
   *Default: claim → name → logo, loop-friendly.*
8. **Sound** — designed-for-sound or silent-first. *Default: silent-first (all three
   references read perfectly muted).*
9. **References & no-gos** — anything to emulate or avoid (e.g. "no glassmorphism").
   *Default: none.*

## 0.75 · PRE-PRODUCTION CONTRACT — the treatment comes before any build

Before writing a single line of Remotion code, produce a **Video Treatment** and get it
approved. The treatment must contain:

1. **Beat sheet table** — one row per beat: `#`, time range, act, what is on screen
   (concrete copy verbatim, not placeholders), motion primitives used (by catalog name),
   and the exit transition (by T-number/name).
2. **Transition plan** — every scene boundary named from §3's catalog with duration and
   easing; confirm zero naked cuts (or the ≤2 deliberate dark-payoff cuts for [C]).
3. **Type & token sheet** — title/body sizes, palette, chip colors, amplitude budget
   statement for the chosen tier.
4. **Escalation check** — for MEDIUM: confirm the trilogy escalates toy → work → money
   and each demo ends on a payoff, not on UI.

Only after the user approves the treatment: hand off to the `feature-promo-animation`
skill (Remotion architecture, still-verification loop, render).

## 1 · Storyboard Blueprints

### Blueprint 1 — FEATURE PROMO (source A · QUICK tier, ~25–35s)

| Act | Share | Job | Emotional beat |
|---|---|---|---|
| **HOOK** | ~17% | Name the pain: 1–2 problem vignettes in the user's world, desaturated | tension, recognition |
| **INTRO** | ~15% | Name the hero: product name typed giant → tagline → product in real context | relief, arrival |
| **FEATURES** | ~42% | Prove it: 3–4 beats alternating UI-demo ↔ kinetic-type claim | momentum, delight |
| **CTA** | ~25% | Land it: logo lockup + positioning line + LONG hold | calm, confidence |

### Blueprint 2 — BRAND LAUNCH (source B · HIGH tier, ~45–60s)

| Act | Ref timing | Job | Emotional beat |
|---|---|---|---|
| **BIRTH** | 0–5.2s (10%) | Identity first, no problem hook: the mark assembles from a single dot; palette floods through it; brand field erupts | intrigue → arrival |
| **WORLD** | 5.2–10s (9%) | Zoom out: the lockup is one artifact on a vast product canvas; whip-pan montage across real screens (~0.7s/cut — the only fast cutting in the piece) | scale, "this is big" |
| **POSITION** | 10–14s (7%) | One diagram: product icon center, ecosystem satellites orbiting; headline swaps in place to restate the thesis | clarity |
| **PERSONALITY** | 14–17.6s (7%) | One playful beat with zero information: a status pill ("X is Thinking…") drifting through empty space, then morphing into the app icon | charm, humanity |
| **DEMO** | 17.6–39.6s (40%) | Zoom-choreographed product walkthrough: components enter as set pieces, camera alternates macro ↔ context, agent does real work (typed prompt → checklist completes) | competence |
| **PROOF** | 40–48.4s (15%) | Claim card ("From context to live funnel in seconds") + real output side-by-side with the agent chat | belief |
| **SEAL** | 48.4–54.8s (12%) | Success state (pulsing check + result line) → brand gradient floods back → wordmark re-assembles exactly as it was born → hold → out | triumph, closure |

### Blueprint 3 — CAPABILITY ANNOUNCEMENT (source C · MEDIUM tier / house standard, ~40–60s)

| Act | Ref timing | Job | Emotional beat |
|---|---|---|---|
| **TITLE** | 0–4s (7%) | Two typed title cards in white void: "Introducing X" → one-line thesis ("A new class of intelligence"). Type fast (~25 chars/s), hold long | quiet confidence |
| **SURFACE** | 4–8.5s (8%) | The product surface (prompt bar/window) fades+scales in small; camera pushes to macro; the first prompt is *typed live* with chip tokenization — the capability claim written as an actual prompt | intimacy with the product |
| **DEMO ×3** | 9–50s (75%) | Escalating trilogy separated by claim interstitials: **toy** (delight, ~5s — a Rubik's cube) → **workflow** (depth, ~19s — bug fix across Slack/GitHub) → **deliverable** (value, ~13s — financials → presentation). Interstitials are centered typed lines ("That takes action across your apps", "And keeps going until the task is done") | growing belief |
| **OUTRO** | 50–55s (9%) | Three quiet cards: closing claim → model name → logo mark → black. Each ~1.2–1.5s, soft fades | calm authority |

**Demo trilogy law (C):** order demos toy → work → money. Delight earns attention, depth
earns trust, value earns the sale. Each demo ends on a *human or business payoff* (an emoji
reaction in Slack; an executive summary slide), not on the UI.

**Choosing:** launching a *feature/model* → Blueprint 1 (pain first) or Blueprint 3
(capability first — no pain framing at all; the house default). Launching a *brand /
product identity* → Blueprint 2 (identity first). Desire can be built three ways: relief
(1), identity (2), or demonstrated competence (3).

**Bookend law (B):** open and close with the same identity animation (mark assembly). The
video becomes a loop; the brand is the first and last thing seen.

## 2 · Signature System: derive the motion language from the brand

**[B]'s masterstroke — pixel-native motion.** The jurni mark is built of pixels, so *all*
motion is quantized: the glyph assembles pixel-by-pixel, background bars rise in stepped
pyramid columns (equalizer-like, no easing — deliberate tick-tick steps), the wordmark
types on with glitchy pixel fragments, color floods the mark cluster-by-cluster. The
motion-energy profile confirms: constant small steps, no smooth curves. **Rule: find the
construction principle of your logo (pixels, strokes, prisms, orbits) and make it the law
of physics for the whole video.** The mark's color-cycling doubles as a palette showcase.

**[A]'s version — "liquid light":** one glowing energy organism reused in 4 forms:
marker-highlight leading typed headlines · comet that paints words in accent color then
settles to ink · aurora wash breathing behind text cards · lens-blob that reveals scenes
through refraction.

Both agree: **one signature motif family, used everywhere, and nothing else is flashy.**

**Object permanence (both):** promote a micro-element into the transition vehicle. [A]: the
picker's bouncing ball becomes the comet that flies through a hard cut. [B]: the thinking
pill swallows its own text and collapses into the app icon; the birth animation returns as
the outro. A persistent caret narrates [A]'s three scenes.

## 3 · Transition Catalog (measured)

| # | Name | Src | Mechanics | Duration | Easing | Use when |
|---|---|---|---|---|---|---|
| T1 | **Camera fly-through** | A | push through content → 2–3 frame bloom/whiteout → next de-blurs in | 0.35–0.5s | accel → spike → ease-out | leaving a "world" |
| T2 | **Defocus swap** | A | content blurs away in place; next fades in sharp | 0.3–0.4s | ease-in-out | low-drama content change |
| T3 | **Lens-blob reveal** | A | refracting circle blooms center-out revealing next scene | ~0.5s | bell | entering product world |
| T4 | **Comet bridge** | A | hard cut masked by object flying across it | cut 1f; flight ~1s | linear + eased settles | high-energy pivot |
| T5 | **Ribbon S-wipe** | A | aurora ribbon sweeps L→R pushing scene out | ~0.4s | bell | into the CTA |
| T6 | **Ghost-wipe text exit** | A | text exits with directional blur smear | ~0.25s | ease-in | clearing a headline |
| T7 | **Zoom-out world reveal** | B | current card shrinks to become one object on a vast canvas | 0.25–0.3s snap (95% of distance in ~4 frames) | extreme ease-out | "part of something bigger" |
| T8 | **Whip-pan canvas hop** | B | camera whips between clusters on the canvas; motion blur covers the cut | ~0.7s/hop, 4–6 hops | punchy in-out | rapid capability montage |
| T9 | **Element morph** | B | container collapses around its icon (pill→app icon), text fades as width shrinks | ~0.45s, snap at 70% | ease-in → snap | personality → function |
| T10 | **Gradient flood** | B | brand gradient washes over a neutral scene from the edges | ~1.2s continuous | slow build | success → brand seal |
| T11 | **Component assembly** | B | one UI piece (sidebar) enters alone; the full app frame fades in *around* it | 0.4s + 0.6s | ease-out | introducing a product surface |
| T12 | **Card slide-in** | B | white brand card slides from a corner, content pixel-types on | ~0.13s slide (!) then type | near-snap | punctuation moment |
| T13 | **Dark-payoff cut** | C | hard cut from white workspace into a full-bleed DARK result close-up (Slack thread, exec slide); the only violent moments in the piece | 1 frame | n/a | the payoff/result beat — max 2 per video |
| T14 | **Window scale-glide** | C | result window scales up from ~55% over the fading previous context, settles centered | ~0.5s | ease-out | introducing a result surface mid-flow |
| T15 | **Typed-title swap** | C | centered title types on (~25 chars/s), holds ≥1s, crossfades to next typed line | type 0.4s + hold | soft fade between | chapter dividers / claim interstitials |

## 4 · Zoom Choreography (B's defining camera craft)

- Alternate **extreme macro** (a send button or nav item fills the frame) with **wide
  context** (full app visible). Never linger at one scale for more than one beat.
- Macro shots make UI details *set pieces*: a 2-second shot of a button is legitimate if
  something happens to it (hover ignition).
- Wide→macro and macro→wide are *glides* (0.4–0.7s, strong ease-out), not cuts.
- The camera is never static even in holds (±2%/s drift, [A] agrees).
- Sequence discipline: context first (user sees where they are), then macro (what matters),
  then context again (what changed).

## 5 · UI Animation Patterns

- **Panel entrance:** grows from its anchor, blur-to-sharp, ~0.45s ease-out; children
  follow 1–3 frames behind. [A]
- **Component assembly:** navigation/sidebar first, app frame materializes around it. [B]
- **Selection cycling ("snap & hold"):** selected row = white pill, full opacity, ~1.08×;
  others ghost to ~35%. Hop ~100–160ms, hold 600–800ms. Optional physics ball hopping onto
  each selection. [A]
- **Hover ignition:** hovered control lights up with a *full gradient bloom* (a material
  change, not a tint), sustained while hovered; ~1s glow build. Telegraphs the click. [B]
- **Hover slide:** nav highlight pill slides between items (~0.3s), icon gains its color
  when hovered. [B]
- **Cursor-as-narrator:** oversized cursor, deliberate arcs, arrives *before* the action;
  drag-and-drop shown physically (thumbnails fly into the input). [both]
- **Contextual text swap:** greeting/headline rewrites itself to match context ("how can we
  help?" → "let's optimize some funnels!"). [B]
- **Checklist theater** (agentic AI): plan steps appear as an accordion; each completes with
  a check, current step expands with detail. Progress = drama. [B]
- **Status-pill personality:** a "thinking…" chip with animated ellipsis + shifting glow,
  drifting through space — product-as-character. [B]
- **Success state:** pulsing concentric rings around a check + one result line; then brand
  flood. [B]
- **Typing:** 11–14 chars/s with caret; type-big-then-shrink for names. [both]

## 6 · Typography System

- One sans family; hierarchy via size/weight/color only. [both]
- **Arrive-colored, settle-neutral (cross-source law):** text enters in an accent color
  (comet-paint [A], orange/pink type-in [B]) and settles to ink black within ~0.3–0.5s.
  Color marks *newness*; ink marks *read me*.
- Keyword emphasis, two modes, never both: accent color ("No **API** needed") or weight
  ("Just **one** click"). [A]
- **Headline swap-in-place:** a diagram/scene headline replaces itself word-by-word while
  everything else holds ("One Agentic Engine" → "Every Shopping Journey"). Cheaper than a
  scene change; keeps spatial anchor. [B]
- **Media-in-text:** an inline image chip pops *inside* the sentence ("from context to live
  [📷] funnel") — the claim carries its own evidence. Pop is a fast transient (~150ms,
  overshoot). [B]
- **Pixel/glitch type-in** for wordmarks: characters assemble with brand-native artifacts. [B]
- Lines hold ≥1.5s after settling; captions quiet gray, fade only. [both]

## 7 · Composition Rules

1. One dominant motion at a time (ambient drift exempt). [both]
2. **Snap & hold:** transients 100–200ms, holds 600–900ms. [both — B's morphs/slides are
   even snappier: 130ms card slide, 100ms pill snap]
3. **Anticipation via stillness:** [B] holds a lone dot ~1.7s before a 0.35s assembly
   burst. Patience makes the payoff. Use before identity moments.
4. Enter slower than exit; blur assists exits. [A]
5. The frame never freezes; near-still during reads. [both]
6. **Scale rhythm** (B): alternate macro/context every beat.
7. Density arc: [A] tapers frantic→calm; [B] spends fast cuts ONLY in the world-tour
   montage, glides everywhere else; [C] has no fast passage at all — 4 cuts in 55s.
   Rule: **one fast-cut passage per video, maximum; zero is a valid choice.**
8. Problem/neutral scenes desaturated; brand/product scenes saturated. [A,B]
9. **Content-driven motion (C's law):** in demo scenes, nothing moves unless the product
   caused it — a log line appears because the agent acted; a window appears because a
   result exists. Choreography belongs to titles and transitions only.
10. **Light is grammar (C):** white = work in progress; dark full-bleed = finished result.
    Spend dark sparingly so the payoff cut lands.
11. **Amplitude budget by tier:** B may shout (snaps, floods, whips), A may gesture
    (comets, blooms), C may only breathe (fades, drifts, typing). Never mix budgets in
    one video.

## 8 · Timing Charts

**[A] Feature promo, 26.5s** — beats ≈1.8s, transitions ≈0.4s, CTA hold 6s:
```
0.0 HOOK tabs+type · 2.4 flythrough · 2.7 terminal · 4.6 defocus · 4.9 name-type
6.4 lens-reveal · 6.9 desktop · 8.9 bar-type · 10.4 picker cycles · 13.8 comet cut
13.8 kinetic claim · 16.4 second claim · 17.9 lens#2 · 18.4 dock+title · 19.9 ribbon
20.3 CTA lockup + 6s hold
```

**[C] Capability announcement, 55s (house standard)** — only 4 hard cuts total; soft
fades 0.3–0.5s; motion-energy peaks 10–60× lower than A/B:
```
0.0  "Introducing GPT-5.5" types (0.5s) + holds · 2.0 thesis line types + holds
4.0  title recedes, product window fades/scales in · 5.6 push to prompt-bar macro
6.3  typing "Use @browser…" · 6.5 chip-tokenize · 8.5 prompt completes
9.0  DEMO 1 (toy): browser solves 3D cube, move tooltips, log streams   (~5s)
14.0 claim interstitial "That takes action across your apps"
16.0 DEMO 2 (work): typed prompt w/ chips → log theater (Using Gmail→Slack→GitHub,
     checklist accumulates, Thinking shimmer, file reads, diff card +69 −24,
     automation rule) · 30.3 Slack window scale-glides in · 32.4 DARK CUT to
     thread close-up · 34.4 emoji reaction pops (human payoff)          (~19s)
35.0 claim interstitial "And keeps going until the task is done"
37.0 DEMO 3 (money): prompt → file browser, sequential file highlights →
     split doc+sheet view → charts assemble · 48.8 DARK CUT to Executive
     Summary slide · 50.1 zoom out to context                            (~13s)
50.5 outro: claim types → "GPT-5.5" → OpenAI mark → black (each ~1.3s)
```

**[B] Brand launch, 54.8s** — beats ≈2.2s, glides ≈0.3–0.7s, outro 6.4s:
```
0.0  dot holds (anticipation 1.7s) · 1.7 glyph assembles 0.35s · 2.3 color floods
3.0  pixel bars erupt · 4.8 wordmark glitch-in · 5.2 gradient lockup hold
6.3  zoom-out world reveal (0.3s) · 6.3–10 whip-pan montage (~0.7s/hop, 5 hops)
10.4 orbit diagram + headline swap ("Engine"→"Journey") · rings pulse
14.0 thinking pill drifts, ellipsis loops · 16.5 pill→icon morph (0.45s)
18.0 brand card slides (0.13s) + pixel-type · 19.6 sidebar alone
21.2 MACRO nav hover slide · 23.6 app assembles around sidebar
24.8 drag-in attachments · 26.0 MACRO prompt card, typing · 28.9 MACRO send bloom
31.2 dialog · 32.4 context · 34.4 MACRO send · 37.2 agent responds
38.4 checklist completes · 40.0 claim card types (accent→ink) + inline image chip
42.0 result split: chat + live funnel page · 47.6 "Finished!"
48.8 success check pulses · 50.0 gradient flood (1.2s) · 51.2 glyph alone
53.2 wordmark re-assembles (mirrors birth) · 54.4 hold → out
```

## 9 · Design Tokens

```
[shared]
color.arrive        accent hue for entering text → settles to ink in 0.3–0.5s
motion.snap         100–160ms   motion.enter 300–500ms ease-out
motion.transition   350–500ms bell   motion.exit 200–300ms + blur
type.speed          11–14 chars/s   stagger.items ~80ms   stagger.words 150–250ms
camera.ambient      ~2%/s drift, never static
hold.state          600–900ms   hold.end-card 5–6.5s

[A-flavor]   ground #FFF · ink #111 · teal-cyan accent · glass panels (blur, 24–28px radius)
[B-flavor]   ground #FAF3ED cream · ink #000 · gradient field (coral↔violet↔orange, always
             drifting) · pixel quantum = the mark's pixel size; stepped motion, no easing
             on brand elements · soft glow shadows under floating chips/pills
[C-flavor]   ground #FFF white void · ink #000 grotesk · NO decorative accent — color
             lives only in chips (tool pills), app icons, diff greens/reds, and product
             content · UI floats as rounded shadowed cards · dark full-bleed reserved
             for results (max 2 moments) · fades 0.3–0.5s, scale drift 2–5% ·
             titles type ~25 chars/s, prompts ~15 chars/s · amplitude discipline: if a
             motion would be noticed on its own, it's too much
zoom.macro          UI element fills 60–90% of frame height
zoom.glide          0.4–0.7s strong ease-out (95% distance in first third)
bloom.hover         full-gradient ignition, ~1s build, sustained while hovered
```

## 10 · Motion Vocabulary (named primitives)

| Primitive | Src | Recipe |
|---|---|---|
| `type-on + highlighter` | A | chars type w/ caret; accent blob trails newest word; fades 0.6s after settle |
| `type-big-then-shrink` | A | name types at display scale, line scales down into lockup |
| `comet-paint` | A | comet passes → word appears accent+blur → settles ink 0.35s |
| `word-pop sequence` | A | words 0.15–0.25s apart, blur+color → sharp |
| `ghost-wipe` | A | text exits with directional blur smear 0.25s |
| `lens-reveal` | A | refractive circle blooms revealing next scene 0.5s |
| `fly-through` | A | camera pushes through content → bloom → de-blur landing |
| `ribbon-wipe` | A | aurora S-curve sweeps horizontally |
| `anchored-grow` | A | panel scales from trigger, blur→sharp, children follow |
| `snap-select + ball` | A | selection snaps rows 130ms; ball arcs onto selection |
| `stagger-build` | A | list items scale-in 80ms apart |
| `speed-blur landing` | A | lockup materializes with horizontal motion blur |
| `camera-breathe` | both | ±2% slow zoom during holds |
| `dot-birth` | B | lone dot holds (anticipation) → pixels fly in and snap to grid 0.35s |
| `palette-flood` | B | brand colors invade the mark cluster-by-cluster, cycling hues |
| `quantum-bars` | B | stepped pixel columns rise like an equalizer, no easing |
| `glitch-type` | B | wordmark assembles with brand-native pixel fragments |
| `world-zoom` | B | card snaps out to become one object on a vast canvas |
| `whip-hop` | B | motion-blurred camera hops between canvas clusters ~0.7s |
| `orbit-diagram` | B | icon center, satellite chips, expanding rings pulse |
| `headline-swap` | B | title rewrites word-by-word in place, scene holds |
| `drift-pill` | B | status chip floats through space, ellipsis loops, glow shifts |
| `swallow-morph` | B | container collapses around its icon; text fades as width shrinks |
| `hover-ignite` | B | control lights with full gradient bloom while hovered |
| `hover-slide` | B | nav highlight pill glides between items 0.3s |
| `checklist-theater` | B | plan steps complete one-by-one with checks; current expands |
| `media-in-text` | B | image chip pops inline inside a sentence, 150ms overshoot |
| `success-pulse` | B | concentric rings pulse around a check |
| `gradient-flood` | B | brand gradient washes over neutral scene 1.2s |
| `bookend-assembly` | B | outro re-runs the birth animation; video loops |
| `typed-title` | C | display-scale title types ~25 chars/s, holds ≥1s; no color, no blur |
| `chip-tokenize` | C | a typed @-mention/#-channel converts in place into a colored icon pill ~0.1s after the word completes — chips are the ONLY accent color in the system |
| `log-theater` | C | agent work as an accumulating text checklist with app icons; "Using X" headers swap as tools change; shimmer "Thinking"; diff stats in green/red — every motion is caused by the agent doing something |
| `claim-interstitial` | C | centered typed line on white void between demos, 1.5–2s, acts as a chapter divider |
| `demo-trilogy` | C | three demos escalating toy → work → money, each longer/deeper than the last |
| `human-payoff` | C | end a demo on a human reaction (emoji pop on the Slack message) — social proof as punchline |
| `float-card UI` | C | UI windows float as rounded shadowed cards in white void; enter by fade + 2–5% scale drift, ~0.4s |
| `sequential-highlight` | C | list items (files) hover-highlight one after another ~0.5s apart as the agent reads them |

## 11 · Reusable Guidelines

- **Feature launch?** Blueprint 1. **Brand/identity launch?** Blueprint 2. Hybrid (new
  product with new brand): B's Birth+World, then A's Features alternation, B's Seal.
- **How should UI appear?** As set pieces: one component enters alone, the rest assembles
  around it. Then zoom-choreograph macro↔context.
- **How should typography animate?** Arrive colored, settle to ink. One family. Emphasis by
  color OR weight. Swap headlines in place when the scene should hold.
- **How is attention directed?** By the signature energy motif, the oversized cursor, macro
  zooms, and hover ignition — never by adding more simultaneous motion.
- **How do scenes transition?** Masked, eased, or object-bridged. Zero naked cuts.
- **How does complexity build?** [A] problem→calm taper. [B] identity→scale→detail→seal.
  Both end calmer than they began.
- **How should it end?** Long hold (≥5s), brand lockup, loop-ready — ideally the same
  animation that opened.

## 12 · Production Checklist

1. Pick blueprint (feature vs brand). Write acts + one claim line per beat.
2. Derive the motion language from the brand mark's construction (pixels/strokes/orbits).
3. Design the signature energy motif family (≤4 forms of one organism).
4. Rough timing: beats 1.8–2.2s, transitions 0.3–0.5s, end hold ≥5s, total 25–60s.
5. Plan zoom choreography: mark each beat macro or context; alternate.
6. One persistent object across ≥2 scenes; bookend the identity animation if brand-led.
7. Max one fast-cut montage passage; everything else glides.
8. Anticipation before identity moments (hold a beat of stillness).
9. Text: arrive-colored→ink; keywords via color or weight; media-in-text for claims.
10. Agent/AI products: show the checklist completing — progress is the drama.
11. Verify at 0.25×: word settles, child-follow offsets, no double motion, no naked cuts.

## Measured motion values — GPT-5.5 (medium tier · house standard)

Extracted frame-by-frame at 60fps (diff-to-final progress fitting against a cubic-bezier
bank + bounding-box tracking). Use these as the DEFAULT values when composing a medium-tier
promo — they are the calmest, most content-driven of the three tiers.

**Typography**
- **Type-on = constant rate (≈ linear)**, caret visible. ~35 chars/s for titles, ~28–30 for
  prompts. Titles at display scale.
- **Hold ≥ 1.0s** on a settled title before it leaves. **Exit = quick fade ~0.1–0.2s**, no
  big movement.
- Medium tier does NOT arrive-color text (unlike A/B) — titles are plain ink; the only
  accent color is in chips.

**UI component enter / exit**
- **Enter = ease-out, strongly front-loaded** — `cubic-bezier(.25,.46,.45,.94)` (easeOutQuad;
  easeOutSine a close 2nd). ~50% of the change in the first ~30% of the time.
- **Scale is used a LOT — but by element size, and always as a controlled settle, never a
  bouncy overshoot** (see *Scale grammar* below). Two magnitudes:
  - **Inline / feed elements** (chips, log rows, list items): **~0% scale** — they appear at
    full size and **slide** (translateY ~18px) + fade to rest. *Measured:* a log row's text
    box is full width/height on frame 1; only its centroid moves (60→42px), decelerating.
  - **Surfaces / panels / windows** (the set piece that owns the frame): **scale-IN
    ~0.90→1.0 (≈ +9–10% bbox)** while translating toward its anchor, ease-out, ~0.5–0.7s,
    **no overshoot**. *Measured:* the log window's chrome span grows 165→181px monotonically.
    This is the earlier "fade + tiny scale" note corrected — surfaces genuinely scale-pop-in
    from ~0.9; only the small stuff stays flat.
- **Duration:** fast core 0.12–0.30s, settle tail to ~0.5–0.85s for larger surfaces.
- **Hard payoff cut = instant (1 frame)** — reserved for white→dark result reveals (≤2/video).
- **Staggered groups** (stat tiles): each tile ease-out + `scale(.95→1)`, staggered ~3–5
  frames (50–80ms). (The group's diff-to-final reads back-loaded — that's the stagger.)

**Scale grammar** (GPT-5.5's most pervasive transition device — get this right)
- **Enter → decelerate (ease-out).** Surfaces grow ~0.9→1.0 and *settle*. `EASE.out`/`EASE.camera`.
- **Exit into a cut → accelerate (ease-in).** Before a hard cut the outgoing surface **scales
  UP with an accelerating ramp** (a "push" that runs into the cut). *Measured:* composer card
  822→881px and the exec-summary both ramp their diff up (accelerating) straight into the cut.
  `EASE.preCut` (`cubic-bezier(.5,0,1,.5)`).
- **Never overshoots.** Every measured scale approaches its target monotonically — no bounce,
  no elastic. That restraint is what reads "premium/calm" vs. the bouncy [B] jurni style.

**Camera / viewport zoom**
- **Macro push-in (animated):** push in to showcase a hero component right before an
  interaction (e.g. the prompt bar). ~**1.5–1.8× scale**, ~**0.4–0.6s**, strong **ease-out**
  that settles INTO the hold, never overshoots. `cubic-bezier(.2,.9,.25,1)` `EASE.camera`.
  **Origin = the pushed component's center.**
- **Macro crop (static) — the log-theater framing:** the app window is rendered **larger than
  the viewport and pinned to the top-left corner** (traffic-lights/toolbar cropped at the frame
  edges); the camera then **holds dead still** while the agent feed **auto-scrolls inside** it.
  *Measured:* window chrome is pixel-identical at 20.3s and 30.0s — the "motion" is the content
  streaming, not the camera. On entry the crop settles with the surface scale-in (0.9→1.0
  ease-out). Reproduced in `log-theater-zoomed`.
- **Breathe / pull-back:** otherwise the camera holds with a ~2%/s **breathe**; small
  **pull-backs** after a payoff slide.

**Ready-to-use curve set** (Remotion `Easing.bezier`, mirrored in `src/lib/ease.ts`)
```
type-on        linear                         constant char rate
ui.enter       .25, .46, .45, .94   easeOutQuad     EASE.uiEnter
ui.enter(soft) .61, 1,   .88, 1     easeOutSine     EASE.uiEnterSoft
surface.scalein (use EASE.out/camera) 0.9→1.0 ease-out, no overshoot
camera.push    .2,  .9,  .25, 1     strong ease-out EASE.camera
precut.push    .5,  0,   1,   .5    ease-in accel   EASE.preCut  (scale-up into a hard cut)
onscreen.move  .4,  0,   .2,  1     material-std    EASE.move
```

## Reference Implementation — live Remotion library

Fourteen signature primitives are reproduced as working Remotion code in this repo's
**`motion-library/`** (clips labeled with primitive name + source on screen). Live scrubbable
gallery: the GitHub Pages site (`docs/`). 
- `src/clips/A.tsx` — type-on + highlighter · comet-paint · anchored-grow · ghost-wipe
- `src/clips/B.tsx` — dot-birth + palette-flood · quantum-bars · swallow-morph ·
  hover-ignite · headline-swap
- `src/clips/C.tsx` — chip-tokenize · log-theater · **log-theater-zoomed** (static macro crop)
  · dark-payoff cut · **camera macro-push**
- `src/lib/ease.ts` — measured curves incl. the GPT-5.5 set above (`EASE.uiEnter`,
  `EASE.camera`), `qstep` quantized stepper ([B]'s pixel physics), deterministic `rand`.

Preview: `npm run studio` (or `npm run site:dev`) in `motion-library/`. Rendered reel:
`docs/motion-library.mp4`. When building a real promo, START by copying the relevant clip
components — they encode the measured timings. Renderer gotcha: unicode glyphs (✦ ↑) are
unreliable in the headless renderer — draw icons with CSS shapes instead.

## Production Notes (inferred)

After Effects-style: 3D camera over flat comps; graph-editor S-curves everywhere EXCEPT
brand-quantized elements (posterized/stepped keys, `posterizeTime`-like); directional +
gaussian blur as transition assist; precomped UI with parented children; glow/gradient
blooms via masked gradient layers; heavy motion blur on whips and comets. [B]'s canvas
world-tour = one huge precomp navigated by camera keyframes. The meta storyboard bar in [A]
is a teaching overlay — a great internal pre-viz artifact.
