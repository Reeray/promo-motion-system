---
name: promo-motion-system
description: Reusable motion-design system for AI/tech product promo and brand-launch videos, organized by EFFORT TIER (quick / medium / high) with all three tiers grounded in frame-by-frame studied references — [A] Prism AI tutorial (QUICK feature promo), [C] "Introducing GPT-5.5" OpenAI-school (MEDIUM capability announcement, the house standard), [B] jurni brand launch (HIGH). Three storyboard blueprints, 15-transition catalog, 40+ named motion primitives, typography and chip-emphasis rules, zoom choreography, measured timing charts, per-tier amplitude budgets, and design tokens. On invocation, ASK which THEME the user wants — soft light or dark — then route (tier defaults to MEDIUM, the house standard). Use when making a product/feature/model release promo, launch video, teaser, brand reveal, motion graphic, kinetic typography piece, or when storyboarding any announcement video. Triggers on "promo video", "launch video", "brand launch", "release announcement", "motion graphics", "storyboard", "kinetic type".
---

# Promo Motion System — "Structure > Visuals"

> ## REQUIRES — read before starting
>
> **This skill is the design layer only.** It contains no renderer. Before promising a video,
> confirm the build layer exists; if it doesn't, say so up front rather than reaching §0.75 and
> stalling.
>
> | Need | What for | If missing |
> |---|---|---|
> | **`motion-library/`** (this repo) | every `src/…` path below, both gates, the blocks | `npx degit Reeray/promo-motion-system/motion-library motion-library && cd motion-library && npm install` |
> | **`feature-promo-animation` skill** | the Remotion build/render layer §0.75 hands off to | build directly against `motion-library/` and say you are doing so |
> | Node 20+, and Python 3 + `pip install -r motion-library/requirements.txt` | the two gates the laws below call non-optional | a gate you cannot run is a gate you must not claim passed |
> | A browser you can drive, **or** the user's devtools | §0.6 capture | use the Tier-2 snippet in §0.6.2 |
>
> Every `src/…` reference in this file means **`motion-library/src/…`**.
> Optional: `live-page-replica` (public-page capture), `figma-to-code` (unshipped designs).
>
> ### ⚑ THE BLOCK LIST LIVES IN `motion-library/BLOCKS.md`, NOT IN THIS FILE
>
> **Read it before choosing any block.** It is generated from the registries by `npm run blocks`,
> so it is always what is actually implemented — 27 blocks today, with tag, real duration and the
> measured description for each.
>
> The catalogs further down this file (§3 transitions, §10 vocabulary) are **explanation, not
> inventory**: they teach what a `full-tro` is and what each measured law means. Never treat them
> as the list of what you can use. That distinction exists because they *did* drift — a VARY law
> here once recommended transitions that had never been built, and 7 spec files sat unregistered.
> Generated inventory cannot drift; prose can.
>
> Adding a block (for maintainers): write it → register it in its own `src/blocks/` file →
> `npm run blocks`. `npm run check` fails on any unregistered spec, stale manifest, or skill copy
> that has drifted from source.

Extracted frame-by-frame (with per-frame motion-energy profiling to fingerprint easing) from
reference videos. Core thesis: **motion sells the story** — every animation advances the
narrative, directs the eye, or bridges scenes. Nothing moves just to be pretty.

## 0 · ROUTING — always do this first

Unless the user already said so, **ask which THEME they want: soft light or dark.** That is the
one routing question — it sets the stage palette for the whole piece:

| Theme | Stage | Ink | Use / feel |
|---|---|---|---|
| **Soft light** | `PX` — soft off-white **`#e9ecf1`** (surfaces `#f8fafc` sit slightly brighter on top) | `#14161c` | the OpenAI "white void" school: airy, editorial, calm. **Never pure `#fff`** — see the RENDER EXPOSURE law |
| **Dark** | `PD` — **`#0b0e13`** (cards `#14181f`, border `rgba(255,255,255,.10)`) | `#e9ecef` | product/terminal feel, lets colour-rich UI and charts glow; matches dark-theme product captures |

**Two rules that follow from the answer:**
1. **The theme governs the PROMO STAGE** — title cards, interstitials, payoff, CTA. Import `PX`
   (light) or `PD` (dark); never the theme-aware `P` (see DECLARE, DON'T INHERIT).
2. **The product UI keeps the theme it was CAPTURED in.** If the real page is dark, the UI mock
   stays dark even inside a light-stage promo — a screenshot doesn't flip. Getting this backwards is
   what made a UI block invisible once. Where stage and UI themes differ, let the UI float as a card
   against the stage (that contrast is a feature, not a bug).

**Tier is no longer asked — it defaults to MEDIUM** (the house standard: calm, content-driven,
demo-carried). Only revisit tier if the user explicitly asks for a quicker/louder piece, using this
table:

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

After the theme (§0), collect these. Where the choices are enumerable, use a **structured question
UI if the agent has one** (in Claude: AskUserQuestion); otherwise **emit a numbered markdown list
and wait for a reply** — every agent can do that, and the gate is satisfied either way. Accept
"decide for me" and apply the noted default. Do not skip intake unless the user has already
answered these in their brief. Tier is not asked — it defaults to MEDIUM (§0).

⚠️ A structured picker is a convenience, never a substitute for asking. See §0.8.0: putting your
own derived answer into the options and having the user pick it does **not** satisfy a gate.

1. **Subject** — what exactly is being announced (product/feature/model name) and its
   one-line function. *No default; required.*
2. **The One Claim** — if the viewer remembers a single sentence, what is it? Becomes the
   thesis title ([C]) or the recap kinetic line ([A]). *Required; offer to draft 3 options.*
3. **Demoable moments** — what can actually be shown? For MEDIUM: candidates for the
   toy / work / money trilogy. For each, record **how the real UI will be obtained** — see
   §0.6 CAPTURE. Ask now whether surfaces sit behind a login, since that decides the method
   (see the §0.6.2 capability tiers) and is the most common late blocker. *Required for any tier with demo acts.*
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

## 0.6 · CAPTURE THE REAL UI — do this before designing any feature shot (gate)

Pairs with §0.8: the **flow names the surfaces**, this step **gets them**. Neither is done until
both agree. **Do not design or build a feature shot for a surface you have not captured.**
Inventing UI is the single most common cause of a promo that feels fake and teaches the wrong
product — and it is nearly invisible in review, because invented UI still *looks* plausible.

### 1 · List the surfaces
From the flow, write every surface the video must show. For each: *do I have the real thing?*

### 2 · Capture, by access type

**Stated as CAPABILITIES, not tool names** — this skill runs in many agents. Use the best tier you
actually have, and say out loud which one you used, because it determines which §3d checks you can
meet. Never silently skip a tier.

| Situation | Capability needed | Tier 1 (best) | Tier 2 (fallback) | Tier 3 |
|---|---|---|---|---|
| **Auth-walled** (dashboards, settings, anything behind login) | drive a browser already logged in as the user | agent-driven logged-in browser (in Claude: *Claude in Chrome* — `tabs_context_mcp` → `navigate` → `computer{screenshot}` → `get_page_text`) | **user runs the capture snippet below in their own devtools and pastes the JSON** | STOP → blocker (§4) |
| Public page | fetch real DOM + computed CSS | `live-page-replica` skill, or any browser tool | same devtools snippet | user saves the page (Ctrl-S) |
| Design not yet shipped | read the design source | Figma MCP + `figma-to-code` | user exports PNG + pastes the inspect-panel values | STOP → blocker |
| User has it locally | an image | ask for a **screenshot** — fastest path, zero setup | — | — |
| Genuinely unavailable | — | STOP. Record a blocker (§4). Do not invent. | | |

**Read-only always.** Never submit forms, create records, or click destructive controls on a live
account. Filtering, tab-switching and toggling a view are fine — they are how you capture states.

**Tier-2 devtools snippet** (works in every agent, no MCP needed — the user runs it in the console
on the page and pastes the result back):

```js
// select the element in the Elements panel first, then run:
copy(JSON.stringify({
  html: $0.outerHTML.slice(0, 4000),
  style: Object.fromEntries(['font-family','font-size','font-weight','line-height','color',
    'background-color','border','border-radius','padding','margin','display','gap']
    .map(k => [k, getComputedStyle($0).getPropertyValue(k)])),
  text: $0.innerText.slice(0, 1500),
}, null, 1))
```

Same values as Tier 1 — it is the *automation* that is missing, not the data. What Tier 2 cannot
do cheaply: capture **many states** (each filter/toggle result) and **pixel-perfect chart vectors**
(§3e), because both need repeated scripted extraction. Say so explicitly rather than eyeballing.

### 3 · Extract — verbatim, into constants
Pull and record, word for word:
- every **label, button, heading, placeholder, command, URL** that will appear on screen
- the **control type** (a two-way toggle is not a row of chips — getting this wrong rewrites the story).
  **Operate it to confirm — never infer behaviour from the tag/href.** A "category card" that looks
  like an `<a href="/models">` link may actually be the graph's *filter*; the only way to know is to
  click it and watch. (This bit once: cards were called nav links from their href, but clicking them
  recoloured the donut and reshaped the 3D chart by repo type.)
- **states** the flow needs (before/after, empty/filled, default/selected) — capture the **real
  data for each**, e.g. the actual result rows for *every* option the demo clicks (§3b), not one
- the **theme** as the user actually sees it (light/dark), and the real accent colour

### 3b · MEASURE the styles — do not eyeball the screenshot

**UI fidelity is measured, exactly like motion fidelity.** Reading pixels off a screenshot drifts
— the first hardware-filter mock got the body font, chip radius, chip padding, row fill, heading
weight and background colour all wrong, and none of it was obvious in review. Screenshots tell you
*layout*; only the live source tells you *values*.

Use **`live-page-replica`** (real DOM + compiled CSS) or, in Chrome, read the real computed styles:

```js
// per hero element (a chip, a result row, the header): pull the values, don't guess them
getComputedStyle(el).getPropertyValue('font-family' | 'font-size' | 'font-weight' |
  'border-radius' | 'padding' | 'background-color' | 'color' | 'border')
```

Record the exact values as tokens: the **product's real font** (load it via `@remotion/google-fonts`
too — e.g. HF is *Source Sans Pro*, not Inter), radii (a pill is `9999px`, not `18px`), whether a
row is a filled card or **transparent with a 1px border**, real hex/rgb colours (convert oklch/oklab
→ rgb). Build the simplified mock from these tokens — the *look* is measured, the *layout* is simplified.

Put copy AND the measured style tokens in named constants at the top of the promo file, so both are
auditable against the capture and never drift. Then **simplify** the layout per the CAPTURE, THEN
SIMPLIFY law (§0.8) — keep the control being operated, the carried object, and the state that
changes; cut the rest. Simplify *structure*, never *values*.

### 3c · EXTRACT THE COMPONENT, NOT THE VIBE — the deepest fidelity fix

Measuring tokens (§3b) fixes the *paint* but not the *structure*. You can load the right font and
still rebuild a component from your mental model — and the mental model is where fidelity dies: it
invents the icon, drops the avatar, flattens the meta row, guesses the selected state. That is still
eyeballing, one level up. Symptom seen twice: "the extraction is still far from close" even after
the colours were right.

**Fix: replicate the component, don't re-imagine it.** For each hero element (a chip, a card, the
header), capture the real thing and copy it:

```js
el.outerHTML                       // the real node structure — avatar, meta row, every child
getComputedStyle(el)               // per node (see §3b)
// BOTH states of any control you'll operate — grab a selected AND an unselected instance that
// already exist on the page (or toggle it), never guess the difference:
document.querySelector('.tag-selected'); document.querySelector('.inactive')
await fetch(iconUrl).then(r => r.text())   // pull SVG assets to inline verbatim
```

Then **simplify by DELETING nodes** — remove secondary nav, legal text, columns you don't need.
Never restyle or re-draw the nodes you keep. Simplification is subtraction, not reinterpretation.
Promote the reusable atoms into a block (e.g. `blocks/ui/<product>-*.tsx`) built *from the capture*,
so the next video reuses the real component instead of re-inventing it.

### ⚑ LAW — SIMPLIFY BY SUBTRACTION, KEEP THE SKELETON

Deleting nodes is safe; **moving them is not**. The moment you relocate an element to a new region,
the mock stops being *that product* and becomes a generic diagram — the exact "shifted away from the
realness" failure. Simplification removes content within the real skeleton; it never re-flows it.

- **Preserve the page's spatial structure.** If the real page is a **two-panel layout** (left filter
  rail · right results panel), keep those two panels. Cut the *facet groups you don't demo* from the
  left rail (Tasks, Parameters, Libraries…), but the Hardware control stays where it really is, and
  the rail stays a rail.
- **Every element keeps its real region and alignment.** The results count ("Models 2,924,567") lives
  in the **right panel header, left-aligned above the card list** — it is a property of the results,
  not a page title. Do not hoist it into a full-width banner across the top. Same for sort controls,
  search, tabs: they sit where the product puts them.
- **Test:** overlay your layout boxes on the real screenshot. Each kept element should land in the
  same region and alignment as the original. If it moved, you reinterpreted instead of subtracting.

Reducing to "the most meaningful components" means **choosing which real regions to show**, at their
real positions — not redrawing a cleaner page of your own.

### ⚑ LAW — COPY ICONS, NEVER DRAW THEM

Logos, device marks, task glyphs, avatars are the **#1 tell** that a mock is fake — a hand-drawn
"four coloured squares" HF logo reads as wrong instantly, even to someone who can't say why.
- **Copy the site's own SVG** — inline the real `<path d="…">` / asset, verbatim. Never approximate
  a brand mark with shapes.
- **Use the site's real image assets** — author/org **avatars**, product screenshots, raster logos are
  right there in the DOM (`<img src>`). Capture the real URLs and **embed them** (download into the
  project's `public/`, or inline as a `data:` URI so the headless render has no network dependency).
  A real avatar reads as real; a coloured monogram square reads as a mock.
- **Monogram/neutral placeholder is the LAST resort** — only when the asset is genuinely uncapturable
  (auth-gated, hotlink-blocked). It must read as an obvious placeholder + get a blocker note, never a
  lookalike of a real mark.

### ⚑ LAW — MACRO CROP (the "zoomed manner")

The default instinct is to scale a captured surface until it *fits* the frame. That is the wrong
move and it produces the two failures users report most: **"too small to read"** and
**"looks oversize"** — which are the same bug seen from either side of the fit.

**A macro crop renders the surface LARGER than the frame and pins it to a corner — usually top-left
— so the frame is a CROP of the surface, not a FIT of it.** The reference does exactly this: the
log-theater window is 1520px wide inside a 1280px frame, pinned at (60, 34), and its right edge is
simply gone. `log-theater-zoomed` / `MacroCropLog` is the canonical block.

Why it works: at real metrics a product card's body text is 13–15px, which is illegible at 720p.
Fitting forces you to invent bigger type, and invented type is no longer the product. Cropping lets
you keep **every captured number 1:1** and win legibility from one scale constant. The overflow is
not damage — it is the signal that there is more surface than the shot, which is what "zoomed in"
means to a viewer.

**Rules:**
1. **Author at captured metrics.** One `transform: scale(Z)` on the container. Never re-type sizes.
2. **Pin, don't centre.** `position: absolute; left/top; transformOrigin: '0% 0%'`. A centred macro
   crop bleeds on both sides and reads as a mistake; a pinned one reads as a camera position.
3. **Bleed, never slice.** Crop where the content has already ended — padding, a border, trailing
   whitespace. A word cut in half looks like a bug, not a crop. If a layout runs to its full width
   (a two-column grid), either give that state its own smaller scale or collapse it to one column.
4. **Controls stay whole.** Anything the shot EXERCISES — the chip row, the tab bar, the toggle —
   must be fully on screen for the whole shot, at its own smaller scale if needed. Two scales in one
   shot is correct when one layer is the control and the other is the detail.
5. **Prefer vertical overflow.** Height carries "there is more of this" without hiding a control.
6. **Multi-column exists to fit a narrow width.** Once magnified there is no width to fit; one
   column is the same information with nothing off-frame.

**Fit is a bug, not a taste call.** A surface that exceeds the frame, or a text object that wraps
mid-word, passes every existing gate — exposure, contrast, motion, length all read fine. Until a
fit/legibility gate exists, check boundary stills by eye before rendering: the first and last frame
of every UI scene, plus one frame per state.

### 3d · FIDELITY DIFF — the capture gate (do before building motion)

Render the static replica of the hero surface and put it **beside the real screenshot**. Walk this
checklist; every "no" means you are still inventing:
- [ ] **Region & alignment** — every kept element is in its REAL panel/position (count above the list
      in the right panel, filter in the left rail), not relocated into a banner or re-flowed?
- [ ] **Icons & images** — logos/device marks copied as SVG; avatars are the site's REAL images, not monograms?
- [ ] **Card/row structure** matches (avatar · name · full meta row: task • size • updated • ↓dl • ♡likes)?
- [ ] **Selected vs unselected** state matches the real classes (fill, border, the × affordance)?
- [ ] **Layout** (two-panel skeleton, borderless rows vs boxed cards, one column vs grid) is a *deletion* of the real one?
- [ ] Font, radii, colours are the measured values (§3b)?

Only when the replica passes the eye-test against the screenshot do you add motion.

### 3e · PIXEL-PERFECT CHARTS & VISUALS — extract the vector, don't eyeball the projection

A donut, a 3D bar landscape, a treemap, a sparkline — these look impossible to copy, so the reflex
is to eyeball a rebuild. **Don't.** Almost every web chart is one of three things, and all three are
extractable exactly. Inspect first (`el.tagName`, `elementFromPoint`, walk the ancestry):

| Chart is rendered as | How to copy it 100% |
|---|---|
| **SVG** (`<polygon>`/`<path>`/`<line>`/`<rect>`) — the common case | Pull every primitive's geometry + fill from the DOM: `[...svg.querySelectorAll('polygon')].map(p=>({pts:p.getAttribute('points'), f:getComputedStyle(p).fill}))`, same for lines/paths. Then **inline verbatim** (static) OR extract the projection constants + per-element data and **regenerate with the same math** (animatable — preferred for promos). |
| **Canvas 2D / WebGL** | No DOM to read. Capture the exact frame as an image and trace it, or reverse the data + redraw. If neither is feasible, that's a blocker (§4). |
| **HTML/CSS** (divs with `clip-path`, transforms) | Read each node's `getComputedStyle` transform/clip-path/background and reproduce the boxes. |

**The HF storage 3D landscape, worked example:** it was a single `<svg>` = 28 `<line>` (grid) +
123 `<polygon>` (bar faces). We extracted each bar's `[baseX, topY, height, kind]` and the exact
iso projection (tileW 28, tileH 14) + the site's exact face colours (`rgb(169,171,247)` top /
`rgb(122,125,243)` left / `rgb(84,87,205)` right per category), then reproduced the polygons with
the same formula. Result: byte-for-byte geometry, real colours — **and** the heights animate (bars
rise, reshape per filter) because it's parametric, not a frozen screenshot.

**Rules:**
- **Never eyeball a chart's projection or palette.** The iso angle, the tile ratio, the shading
  triple, the grid spacing — all are in the SVG. Read them.
- **Prefer parametric-from-real-data over inlined-static** for anything that must animate (rise,
  count-up, reshape). Inlined raw SVG is pixel-perfect but frozen.
- **Capture every state you'll show.** If the chart reshapes on a filter (All/Public/Private…),
  extract the geometry for each state — the data is real per state, never interpolated-from-guess.
- Tooling note: browser eval truncates long returns — compact on the page (palette-index colours,
  round coords, or extract a compact per-element spec) so the data comes back whole.

### 4 · Blocker list
Anything uncapturable gets written down and shown to the user, e.g. *"exact command string is
behind login — rendered redacted"*. A redacted or abstracted treatment is honest. A plausible
invented string is not, and it will be repeated by viewers as if it were real.

**Gate:** feature shots may not be built until every surface is captured or explicitly accepted
as a blocker — and its static replica passes the §3d fidelity diff.

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

## 0.8 · STORYBOARD — get the user's journey BEFORE the shots (HARD GATE)

*(Formerly "Feature Flow." Renamed to STORYBOARD because that is what it is — the user's
click-by-click journey, agreed before anything is captured or built.)*

The most common failure in a feature act is **boring and confusing**: a series of disconnected
cards with nothing to follow. That happens when shots are storyboarded before the flow is known.
Run this before designing a single feature shot.

### 0 · ASK THE USER FOR THE STORYBOARD FIRST — a STOP, not a suggestion

**STOP after intake. Do not capture UI, write a treatment, or open an editor until the storyboard
is settled with the user.** This step got skipped once — here is exactly how, so it doesn't recur:

> **Why it was skipped (post-mortem):** the step was worded as guidance ("ask the user"), and the
> agent "satisfied" it by putting its OWN derived flow into an AskUserQuestion as the options. The
> user picked one — but was never actually asked to author their journey. Offering the user a menu
> of flows *you* wrote is not asking; it's confirming your idea. The failure was treating a soft
> nudge as done when the user's own voice never entered.

**The rule, unambiguous:**
- **Ask in the user's open words first**, not as multiple-choice: *"Walk me through the exact steps
  you'd show — what the user does, click by click, and what the screen does back. Or say 'you decide'
  and I'll draft one and show it back for your edits."*
- **A derived flow is a fallback.** You may draft one ONLY after the user says "you decide" — and
  then you must **show it back and get an explicit yes before capturing or building.**
- **Multiple-choice ≠ asking.** Do not encode your own flow as the options of an AskUserQuestion and
  call the gate satisfied. The gate is satisfied only when the storyboard came from the user, or the
  user explicitly approved your draft shown back to them.
- Record it verbatim so the beat sheet can be audited against what they asked for.

**Gate check before capture/build:** *Did the user's own words define or explicitly approve this
storyboard?* If no, you have not passed §0.8.0 — go back and ask.

1. **Job line.** One sentence — what the *user* accomplishes. Not what the feature is.
2. **Literal steps.** 3–5 max, each one screen-recordable: `[who] [does what] → [system responds]`.
   If a step can't be filmed, it isn't a step — it's a claim, and claims go in interstitials.
3. **UI state per step.** Surface · what's on it · **what changed**. *The delta is the shot.*
4. **Hero surface + carried object.** One surface persists. When the flow genuinely changes
   surface, pick an **object that travels across the cut** — it becomes the thread AND the
   transition vehicle (see object permanence, §2). A flow with no carried object reads as a
   slideshow.
5. **Cause every cut.** Nothing appears unless a user or agent action caused it.
6. **Reduce to 3 beats.** Kill any step with no visible delta. Merge steps that look alike.
7. **Payoff last.** The final beat shows a *result the viewer wants*, never UI chrome.

**Gates — all three must pass:**
- **Recall:** a viewer who has never seen the product can name the 3 steps after one watch.
- **Delta:** every shot shows a change; two similar-looking shots must merge.
- **Fidelity:** list surfaces needing real capture. **Never invent product UI** (see below).

### ⚑ LAW — DEMONSTRATE BY EXERCISING THE OPTIONS (a feature is a verb)

A feature demo that touches the control **once** and stops is boring, because it shows a *state*,
not a *capability*. The viewer learns what the feature *is*, not what it *does*. To show a feature
works, **exercise its options** — click two or three, and let the result change each time. The
repetition is the proof: cause → effect, cause → different effect.

- For a **filter / selector / toggle**: click option A → list changes; click option B → list changes
  *differently*. The contrast between the two results *is* the demonstration. (Hardware filter:
  click *Apple M4 Max* → 183,651, big models present; click *Apple M1* → 111,230, big models gone.
  One click is a screenshot; two clicks is the feature.)
- **Pick options whose results genuinely differ** — a weak single delta (M4 Max alone drops only
  ~1k) becomes a strong story the moment it's contrasted with a device that filters hard (M1).
- Each click still obeys the rules: real cursor arrives before the action (§5 cursor-as-narrator),
  the control shows its selected state, the result animates the delta, **the data is real for every
  option shown** (§0.6.3 — capture each option's actual result set, never invent the second state).
- Cap it at 2–3 options; more is a spec sheet, not a promo. The last one is the one that lands the
  point (end on the most relatable device, or the strongest delta).

### ⚑ LAW — BLOCK CONTENT ADAPTS, BLOCK MOTION DOES NOT

Every block splits into two halves. Getting them confused is the most common way a block
looks wrong in a new video.

| | Locked | Free |
|---|---|---|
| **What** | timing, easing, stagger, travel distance, camera settle, hold | copy, labels, **icons**, colours, row content, titles |
| **Why** | measured from reference — changing it breaks the feel | it must match the product and story being shown |

**Icons and markers are CONTENT — always adapt them to context:**
- `log-theater` rows: coloured app/tool squares when the story is *"which tool is it using"*
  (Slack, GitHub, Gmail — the reference case).
- Same rows: **green check marks** when the story is *"steps completing"* (an agent building,
  a task list finishing). `MacroCropLog` takes `icon="square" | "check"` for exactly this.
- Never keep a block's demo icons just because they shipped with it. Ask what the row *means*
  in this video, then pick the marker that says it.

Blocks must expose their content as parameters. If you find yourself copying a block to change
its icons or copy, parameterise the block instead — that is the bug.

### ⚑ LAW — CAPTURE, THEN SIMPLIFY (never invent UI)

Invented UI is the other half of "confusing" — viewers feel the fake even when they can't name it,
and invented labels teach the wrong product.

- **Capture first.** Get the real screen using the best tier you have (§0.6.2): an agent-driven
  logged-in browser, else the devtools snippet the user runs and pastes, else a screenshot. Exact
  strings, labels, and control names come from the capture, verbatim — whichever tier produced it.
- **Then simplify — hard.** A promo UI is a **diagram of the product, not a screenshot**.
  - KEEP: the control being operated · the carried object · the state that changes · exact copy.
  - CUT: boilerplate descriptions, secondary nav, legal text, anything unread in 4 seconds.
  - The viewer must be able to read the hero element at a glance. If they can't, cut more.
- **Never fabricate a label, command, or value.** If it can't be captured, flag it as a blocker —
  a redacted/placeholder treatment is honest; an invented string is not.

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

## 2.5 · COMPOSITION MODEL — three layers, never overlapping

A video is assembled from blocks. Blocks live in exactly one layer. **Do not merge layers** —
a transition that also animates words is a bug, not a feature.

| Layer | What it is | Owns | Never touches |
|---|---|---|---|
| **OBJECT** | a text block or a UI block | what is on screen | how scenes hand off |
| **TEXT ANIMATION** | how the glyphs of a text object move | per-character / per-word / per-line motion | object position, scene handoff |
| **TRANSITION** | object-to-object handoff | outro of A + intro of B, applied to the object as a whole | content, copy, glyph motion |

**How to compose:**
1. Pick the **object** (text or UI).
2. If it is text, pick a **text-animation** block for it (`src/blocks/animate-text`).
3. Pick the **transition** for the handoff into/out of it (`src/blocks/transitions`).

```tsx
<ScaleUpCut start={sceneEnd - 6}>        {/* transition: outro   */}
  <GlideIn>                              {/* transition: intro   */}
    <SpecText spec={perWordCrossfade}    {/* text animation      */}
              sample="Your copy here" /> {/* content = context   */}
  </GlideIn>
</ScaleUpCut>
```

**Locked vs free:**
- **LOCKED — do not tweak unless explicitly asked:** every timing, easing, stagger and
  amplitude in the text-animation and transition layers. They are measured, not taste.
- **FREE — set from context every time:** the text **copy**, and which object/UI is shown.

Transitions are tagged **`outro`**, **`intro`**, or **`full-tro`** (an outro+intro pair).
Pick a matching pair or a single `full-tro`; alternate the axis (X / Z) between scenes so
consecutive handoffs do not repeat.

### ⚑ LAW — VARY THE TRANSITIONS (don't ship the same handoff every time)

The catalog (§3) has 17 measured transitions. Defaulting to the same one or two every video makes
the work look like a template and wastes the range. This has already happened — several promos in a
row opened with `scale-up-cut` → `scale-pop-in` (Z-axis) and closed with the same glide. Stop that.

- **Across videos:** do not reuse the previous promo's primary handoff. If the last one was Z-axis
  (`scale-up-cut`/`scale-pop-in`, T17), make this one X-axis (`push-off-left`/`glide-in`, T16) — or
  reach for an unused catalog entry (defocus, lens-blob, window scale-glide, gradient flood…).
- **Within a video:** alternate the axis between consecutive handoffs (X → Z → X); never the same
  transition twice in a row.
- **Keep a note of what shipped.** Record the last video's transitions (e.g. in the promo file
  header) so the next build can deliberately pick different ones. "Which did I use last?" should
  have an answer, not a guess.
- Locked timings/easings still apply — *vary which transition, never how it's tuned* (§2.5).

### ⚑ LAW — NEVER DRIVE A HOVER PREVIEW WITH `play()`

For any gallery, block picker, or editor that previews motion **on hover**: drive the frames
yourself with `seekTo()` inside a `requestAnimationFrame` loop. Do **not** call `Player.play()`.

**Why** (this shipped and cost an afternoon): browsers gate media playback behind *user
activation*, and per spec only `pointerdown` / `click` / `keydown` grant it — **`mouseenter` never
does**. So on a freshly loaded page every hover-triggered `play()` is silently rejected and the
card sits frozen on its poster frame. Then the user clicks anything at all — in our case the
unrelated "copy" button — the document becomes activated, and every later hover works. The
signature to recognise: *"it sticks on first load, but works after I click something."*

```tsx
// hover → advance frames manually; no activation required, deterministic from a cold page
const t0 = performance.now();
const tick = (now: number) => {
  player.seekTo(Math.floor(((now - t0) / 1000) * fps) % durationInFrames);
  raf = requestAnimationFrame(tick);
};
```

Two corollaries: **hover state must be state, not an imperative call** (a hover landing before the
player is ready is otherwise dropped for good — `mouseenter` does not re-fire while the pointer
rests); and if you lazy-mount players, always ship a timeout fallback, because a hidden tab or a
non-compositing webview never fires `IntersectionObserver` and the gallery would render blank.

### ⚑ LAW — VARY THE TEXT ANIMATIONS (≥2 distinct per video, never the same twice)

The text-animation catalog (`src/blocks/animate-text/specs/`, 20+ effects) is there to be used. A
title and a payoff that share the same effect read as a template — the same trap as reusing one
transition.

- **Every promo uses at least TWO distinct text-animation specs.** A one-effect video fails this.
- **Never reuse a spec across scenes** in the same video (title, interstitials, payoff, CTA each get
  their own), and **don't default to the same spec across videos.** `soft-blur-in` has been leaned on
  — reach into the catalog: `focus-blur-resolve`, `per-word-crossfade`, `mask-reveal-up`,
  `line-by-line-slide`, `per-character-rise`, `stagger-from-center`, `shared-axis-y`, `typewriter`,
  `spring-scale-in`, `shimmer-sweep`…
- **Match the effect to the moment** — calm keynote → `per-word-crossfade` / `focus-blur-resolve`;
  punchy → `spring-scale-in` / `stagger-*`; type-driven → `typewriter` — but the ≥2-distinct rule is
  absolute regardless of taste.
- This is CONTENT-layer variety: which spec is FREE, the timing/easing INSIDE each spec stays LOCKED
  (§2.5). Avoid the 3 not-yet-implemented layout-aware renderers (`kinetic-center-build`,
  `short-slide-right`, `short-slide-down`) until built.

## 2.6 · THE PROMO DOC — a promo is data, and `prepare()` is its only boundary

A finished promo is **one JSON file** (`docs/*.promo.json`) rendered by ONE composition
(`Promo`). There are no per-promo `.tsx` files any more, and adding one is a regression: it
puts numbers back where a human has to keep them in sync, and it makes the promo invisible to
the editor. Author the doc; never author a composition.

```jsonc
{
  "v": 1, "id": "hf-storage", "theme": "dark",        // theme: "light" | "dark"
  "scenes": [
    {"id": "title", "kind": "text", "effect": "blur-out-up",
     "copy": "Every repository's storage, visualized", "size": "lg", "hold": "long",
     "enter": "scale-pop-in", "exit": "push-off-left"},
    {"id": "repositories", "kind": "ui", "surface": "hf-storage-repositories",
     "enter": "glide-in", "exit": "scale-up-cut"}
  ]
}
```

### ⚑ LAW — NO NUMBERS IN THE DOC

Every field is a **token**, never a measurement. `size` is `sm|md|lg|xl` (34/48/56/64px),
`hold` is `short|normal|long` (350/550/900 ms), `effect`/`enter`/`exit`/`surface` are ids.
There is not one frame count, pixel value or millisecond anywhere in a doc — and there must
never be. The instant a doc can say `"frames": 120`, two sources of truth exist for how long a
scene runs, and the one the renderer ignores is the one a human will trust.

Corollary: **duration is derived, never declared.**

```
scene = max( body , enter.frames + MIN_SETTLE ) + exit.frames
body(text) = ceil( (spec enter-total + HOLD[hold]) / 1000 * fps )
body(ui)   = the surface's own measured `frames`
```

- The **intro floor** is the `max(...)`: `glide-in` needs 54 frames, so a scene whose text
  finishes in 30 still runs 56. Without the floor a short line gets thrown off stage while it is
  still gliding on. Shortest real scenes derive to ~60f.
- The spec's **exit** and `RT.gap` are deliberately excluded — the doc renders `loop={false}`,
  and the transition owns the exit (§"short throw, cut at peak").
- `prepare()` is the **only** place this arithmetic exists. `calculateMetadata` calls it, and the
  editor's `<Player>` consumes the same `Prepared` object the CLI render does, which is what
  makes preview/render divergence structurally impossible instead of merely tested for. A
  renderer must never see a raw doc.
- Guardrails: `SCENE_WARN` 240f, `SCENE_MAX` 480f, `TOTAL_MAX` 1200f. **`ui` scenes are exempt** —
  a surface's length is measured choreography, not a pacing choice.

### Swap-duration table (measured, at 60fps)

| slot | id | axis | frames | swapping changes the scene by |
|---|---|---|---|---|
| intro | `glide-in` | X | 54 | +28f vs `scale-pop-in` (and can raise the floor) |
| intro | `scale-pop-in` | Z | 26 | −28f vs `glide-in` |
| outro | `push-off-left` | X | 9 | +3f vs `scale-up-cut` |
| outro | `scale-up-cut` | Z | 6 | −3f vs `push-off-left` |

A matched pair collapses into one **full-tro**: `push-off-left`+`glide-in` = `axis-handoff` (X),
`scale-up-cut`+`scale-pop-in` = `depth-handoff` (Z). Junction = `sceneN.exit + sceneN+1.enter`;
that is the unit the editor shows and the unit you should think in.

**Axis adjacency is a WARNING, not an error.** Two junctions in a row on the same axis reads as
one repeated move (§VARY THE TRANSITIONS), so alternate X / Z — but a doc that repeats an axis
still validates and still renders. Never fail a build on taste.

### What is editable, and what is not

| | editable in the doc/editor | why |
|---|---|---|
| **text copy, `sub`** | ✅ free text | it is the story |
| **`effect`, `size`, `hold`** | ✅ swap within the vocabulary | content layer (§2.5) |
| **`enter` / `exit`** | ✅ swap intro↔intro, outro↔outro, full-tro↔full-tro | handoff layer |
| **product-UI surfaces** | ❌ opaque, fixed length | the chart geometry, per-state data and typed choreography were EXTRACTED from the real product (§3c/§3e). Exposing them as doc fields invites exactly the eyeballed drift that work removed. |

Swapping a surface is a **round trip**, not an in-editor action: the agent re-runs capture and
rebuilds the component. Say that plainly to the user rather than implying the surface is editable.

A surface owns two things a scene must not override: its **measured box** (`surfaces/frame.tsx`,
1180×650 centred in 1280×720 — the size its layout was extracted against) and, for a macro crop
that IS the viewport, its **`bleed` flag** (absolutely positioned children collapse inside a
shrink-to-fit transform div, so a bleed scene carries the transition transform on an
`AbsoluteFill`). Get either wrong and the doc render silently stops matching the capture.

### Usable text effects

17 of the 24 specs execute under `SpecText`. Seven are **excluded with a written reason**
(gate B1) and must not be referenced from a doc: `kinetic-center-build`, `short-slide-right`,
`short-slide-down`, `stagger-from-center`, `stagger-from-edges`, `depth-parallax-words`,
`shared-axis-x`. `BLOCKS.md` / `blocks.json` are generated (`npm run blocks`) and are the
catalog of record — read them, don't remember them.

### Gate R5 — every `<SpecText>` in a stage file passes `color` AND `loop={false}`

Both failures are invisible to the pixel gate. `color` defaults to the theme-aware `var(--fg)`,
which is invisible dark ink on a dark stage; `loop` defaults to true, which runs the spec's EXIT
at the hardcoded `RT.hold` mid-scene and leaves the outro throwing an empty stage. `Promo.tsx`
sets both once, which is the other reason to author docs rather than compositions.

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
| T16 | **Axis handoff** (`push-off-left` → `glide-in-build`) | C | one continuous leftward axis: outgoing surface is **thrown a short distance and cut mid-flight**; incoming line **decelerates** onto the same axis (~120px) while its words reveal ~85ms apart | exit **150ms** · enter ~**0.9s** | exit **ease-IN** (`EASE.throwOut`) · enter **strong ease-OUT** (`EASE.out`) | demo → claim-interstitial boundary; any scene→line handoff |

| T17 | **Depth handoff** (`scale-up-cut` → `scale-pop-in`) | C | the same cut-at-peak law on the **Z axis**: outgoing element **swells ~6% and is cut mid-swell**; incoming surface **pops from 0.76 scale** and decelerates into place | exit **100ms** · enter ~**430ms** | exit **ease-IN** (`EASE.throwOut`) · enter **strong ease-OUT** (`EASE.camera`), no overshoot | title → product-surface reveal; any depth/context change |

**T17 measured** (GPT-5.5 @3.90–4.45s, bbox tracking): the title's width goes 1158 → 1163 → 1170 → 1178 → 1190 → 1206 → **1230** (+6.2%), accelerating (+5, +7, +8, +12, +16, **+24** px/frame), then cut on the next frame. The incoming surface enters at **0.76** scale and decelerates 0.76 → 0.909 → 0.969 → 0.990 → 1.0 (**62% of the change in the first 83ms**), monotonic — **no overshoot**. Ink density held flat (0.0456 → 0.0473), so there is **no fade**: it enters at full opacity and lets scale alone carry the entrance.

### ⚑ LAW — "short throw, cut at peak" (applies to EVERY exit, not just T16)

**Outgoing elements never animate off-screen.** They accelerate through a *tiny* displacement and
are **hard-cut at peak velocity while still fully on screen**. The eye extrapolates the motion, so
the cut reads as a throw — and it costs a fraction of the time a real exit would.

*Measured* (GPT-5.5 @13.45–13.60s, per-frame edge tracking): the window's left edge goes
110 → 109 → 108 → 106 → 103 → 102 → 99 → 94 → 90 → **80**, then the frame is empty on the next
frame. That is **30px total — ~1.5% of frame width — over 150ms**, accelerating throughout
(−1 → −5 → **−10** px/frame) and cut at its fastest moment. Card width holds 1701→1702px, so it is
**pure translation, no scale**. The same economy governs the other exits: the composer card scales
822→881px then cuts (5.6s); the exec-summary ramps then cuts (50.1s).

**Do not** ease an exit out to opacity 0 over half a second, and **do not** translate it off-frame.
Throw it ~1.5% of frame width, accelerating, then cut. `EASE.throwOut` encodes the curve.

*Enter half, measured* (13.60–14.5s): left edge 325 → 205 = **120px** with velocity decaying
−29 → −12 → −8 → −4 → −2 → −1 → 0 (~0.9s long-tailed settle); words reveal ~85ms apart. Both halves
travel the **same direction**, which is what sells the continuity (Material's "shared axis X").

Reproduced as three tagged blocks in `src/blocks/transitions.tsx` — `push-off-left` **[outro]**,
`glide-in-build` **[intro]**, `axis-handoff` **[full-tro]** — rendered at 60fps so the 150ms throw
reads as motion rather than a cut.

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
[C-flavor]   ground = soft off-white #e9ecf1 (NEVER #fff — see Render Exposure) · ink #000 grotesk · NO decorative accent — color
             lives only in chips (tool pills), app icons, diff greens/reds, and product
             content · UI floats as rounded shadowed cards · dark full-bleed reserved
             for results (max 2 moments) · fades 0.3–0.5s, scale drift 2–5% ·
             titles type ~25 chars/s, prompts ~15 chars/s · amplitude discipline: if a
             motion would be noticed on its own, it's too much
zoom.macro          UI element fills 60–90% of frame height
zoom.glide          0.4–0.7s strong ease-out (95% distance in first third)
bloom.hover         full-gradient ignition, ~1s build, sustained while hovered
```

### ⚑ LAW — DECLARE, DON'T INHERIT (the gallery lies; the render tells the truth)

**The single highest-frequency bug class in this system.** The gallery renders compositions
inside a normal page, so they inherit font, colour and background from the site CSS. **A
headless render has no page CSS.** Anything a component *inherits* rather than *declares*
silently differs between the two: it looks perfect in the gallery and is wrong in the MP4.

It has shipped three separate times:

| # | Inherited | Gallery | Render |
|---|---|---|---|
| 1 | background — `var(--bg, #ffffff)` | correct theme | **pure white, 252/255 mean** (blinding) |
| 2 | colour — theme-aware `P.fg` on a fixed dark stage | correct | **dark-on-dark, invisible** |
| 3 | font — no `fontFamily` at all | Inter (from page CSS) | **serif** |

**Rule:** a stage owns its `fontFamily`, `background` and `color`. Never rely on a parent, a
theme variable, or the page. Fixed-palette work (promos, product-UI mockups) uses `PX`/`PD`,
never the theme-aware `P`.

**Fonts are worse than "declare" — they must be LOADED.** Declaring `fontFamily: 'Inter'` is
not enough: a render only has the fonts registered with the browser Font Loading API. The
gallery's `<link>` to Google Fonts does nothing in a headless render, so a declared-but-unloaded
family falls back silently (Inter → serif; IBM Plex Mono was never a Google font at all, so it
never loaded anywhere). **Load via `@remotion/google-fonts`** in one module (`src/lib/fonts.ts`)
and use its returned `FONT.sans` / `FONT.mono` everywhere — never a literal family string. Scope
`loadFont` to the weights/subsets you use, or it fetches all of them (35–70 requests/render).
Sans = **Inter**, mono = **IBM Plex Mono**. The `check` gate rejects any hardcoded family name.

**This law is enforced mechanically — a written rule was not enough, it failed three times:**

```bash
npm run check                        # BEFORE render: static gate
npm run check:render out/<file>.mp4  # AFTER render: pixel gate
```

- `check` — flags any stage declaring a background without a font, pure-white stages, and
  theme-var leakage into fixed-palette files. It found 4 further instances the moment it was
  written, including one in a promo that had already been reviewed and shipped.
- `check:render` — measures the actual MP4: exposure (mean luminance, blown pixels),
  legibility (contrast present = text actually rendered), and frame variance (not a dead shot).
  The live preview never touches the encoder, so it cannot catch any of these.

Both must pass. A render that fails either does not ship.

### ⚑ LAW — TAG THE COLOUR, OR THE PLAYER INVENTS IT

**Before diagnosing a render as too bright, too dark or washed out, check the file's colour tags.**
A correct picture in a wrongly-described file is indistinguishable from a badly-graded one by eye,
and every pixel measurement will say it is fine — because a decoder applies the file's own tags
before you measure it.

This shipped here. Remotion 4 defaults `--color-space` to `default`, which produces:

```
yuvj420p (pc, bt470bg / unknown / unknown)     # full-range luma, BT.601 PAL matrix
```

Full-range means luma occupies 0–255. But MP4/avc1 convention is limited range (16–235), so most
players ignore the `pc` flag and **expand** 16–235 onto 0–255. Measured on a real render, that
expansion drove **94.9% of the frame to pure #ffffff** (versus 26.9% decoded correctly) — a video
that looked blinding while its own frames, extracted as PNG, looked perfect.

**The tell:** stills look right, the video does not. If a PNG of frame N and the MP4 at frame N
disagree, it is never the design — it is the container. Confirm with:

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt,color_range,color_space file.mp4
```

Want `yuv420p, tv, bt709`. Anything with `pc`, `yuvj*` or `bt470bg` is mis-signalled.

**The fix is a config, not a flag.** Put it where every entry point picks it up — CLI render,
`still`, Studio, and any programmatic render — because a flag someone has to remember is a bug
waiting for the next promo:

```ts
// remotion.config.ts
Config.setColorSpace('bt709');
Config.setVideoImageFormat('png');  // lossless into the colour conversion
```

Then **gate it**: the post-render check must assert the tags, not just the pixels. Note the cost
of doing this right — limited range stores 219 levels instead of 256, so a re-encode shifts the
decoded picture by ~1–2/255. That is the correct trade and what every player expects.

**Why the pixel gate cannot cover this:** it decodes with the tags applied, so a mis-tagged file
measures identically to a correct one. Tags need their own check. This is the same class of bug as
DECLARE, DON'T INHERIT — something outside the frame deciding what the frame means.

### ⚑ LAW — RENDER EXPOSURE (never ship a blinding video)

Blocks use CSS vars so the gallery can follow the site theme. **A headless render has no
`:root` theme, so the var FALLBACK is what ships in the MP4.** A `#ffffff` fallback on a
full-frame stage measured **252.1/255 mean luminance with 93.5% of pixels ≥ 250** — a white
screen for the whole runtime. Painful to watch, and broadcast-unsafe.

**Rule:** large flats never sit on pure white.
- stage `#e9ecf1` · surfaces `#f8fafc` sit *slightly brighter* on top for depth · ink `#14161c`
- Import from `src/lib/palette.ts` (`P.bg`, `P.card`, `P.fg`, `P.border`). **Never hardcode
  `#fff` as a stage background**, and never rely on a `var(--bg, #ffffff)` fallback.

**Verify every render — this is a gate, not a nicety:**
```
mean luminance  < ~245 / 255
pixels >= 250   < ~40%
```
Measured on the fixed HF promo: **234.8 mean, 0.8% ≥250, corner 233,235,241.** Before the fix:
252.1 / 93.5% / 255,255,255. Same grammar, same white-void look — just not blinding.

The reference itself is not pure white either; "white void" means *low-contrast bright ground*,
not maximum luminance.

**Corollary — theme-aware vs FIXED (getting this wrong makes blocks unreadable):**

| Block kind | Palette | Why |
|---|---|---|
| pure typography | `P` — theme-aware (`var(--bg)`, `var(--fg)`) | stage and text flip **together**, so contrast always holds |
| **product-UI mockups**, rendered promos | `PX` — **fixed** soft light | their ink text is baked dark; if the surface follows a dark theme the text stays dark and the block goes **invisible** |

A mockup of a light app must not invert with the site theme — a screenshot doesn't flip.
Symptom to watch for: a UI block that looks fine in light mode and turns into an empty card in
dark mode. Verify a render actually contains ink: pixels < 120 should be **> 0.3%** of frame.

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

0. **Capture the real UI (§0.6) before designing any feature shot.** Every on-screen string
   verbatim from the capture; every uncapturable surface written into a blocker list. No
   invented labels, commands, or control types.
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
12. **Run both gates — not optional, and not replaceable by watching the preview:**
    - `npm run check` **before** rendering (declare-don't-inherit: font/background/colour,
      no pure-white stage, no theme vars in fixed-palette files).
    - `npm run check:render out/<file>.mp4` **after** rendering (exposure, legibility, motion).
    The live `?promo=` preview is for iterating; it never runs the encoder and cannot catch
    exposure, invisible text, or serif fallback. Iterate live, **verify by render**.

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

The library is organised as composable **blocks** (category + source), assembled like Lego to
build a promo. Live gallery: the GitHub Pages site (`docs/`) — hover to play, click to pause.
Categories: **Formula** (storyboard blueprint strip) · **Typography** · **UI motion**.
- `src/blocks/animate-text/` — **typography blocks**, duplicated faithfully from the
  `pixel-point/animate-text` skill. `specs/*.json` are that skill's portable motion contracts
  copied verbatim; `SpecText.tsx` is a data-driven renderer that *executes* those specs
  (target split, from→to keyframes, durations, staggers, easing) under the website-default
  runtime. 17 generic effects live; the 3 layout-aware kinetic renderers
  (`kinetic-center-build`, `short-slide-right`, `short-slide-down`) are still to do.
- `src/clips/C.tsx` — **UI-motion blocks**: chip-tokenize · log-theater ·
  **log-theater-zoomed** (static macro crop) · **camera macro-push**
- `src/clips/A.tsx` / `B.tsx` — the tier-A/B reproductions (anchored-grow, ghost-wipe,
  dot-birth, quantum-bars, swallow-morph, hover-ignite, headline-swap).
- `src/lib/ease.ts` — measured curves incl. the GPT-5.5 set above (`EASE.uiEnter`,
  `EASE.camera`, `EASE.preCut`), `qstep` quantized stepper ([B]'s pixel physics), `rand`.

Note: the **dark-payoff cut** demo block was removed from the library. The transition itself
(T13) and the "light is grammar" principle remain documented above as measured design rules.

**Smoothness recipe** (how to avoid stiff, "snapping" text motion):
- **Smootherstep, not linear/threshold.** Reveal each element with `t³(t(6t−15)+10)` so it has
  zero velocity AND acceleration at both ends — no visible on/off snap.
- **Overlapping windows.** Neighboring words/chars ease in over generous, overlapping ranges so
  motion is continuous rather than "everything moves then stops."
- **Interpolate color, never switch it.** `interpolateColors(p,[0,1],[accent,ink])` — the comet's
  paint reads as a smooth material change, not a hard recolor (the old version's main stiffness).
- **Velocity-scaled motion blur.** The comet streak length = |Δhead|·k, so it stretches when fast
  and tightens when slow — the single biggest "smooth" tell for anything that travels.
- **spring() for organic settles**, near-critically damped (`damping≈26, stiffness≈120`) to keep
  the GPT-5.5 "no overshoot" feel.

Preview: `npm run studio` (or `npm run site:dev`) in `motion-library/`. When building a real promo,
START by copying the relevant clip components — they encode the measured timings. Renderer gotcha:
unicode glyphs (✦ ↑) are unreliable in the headless renderer — draw icons with CSS shapes instead.

## Production Notes (inferred)

After Effects-style: 3D camera over flat comps; graph-editor S-curves everywhere EXCEPT
brand-quantized elements (posterized/stepped keys, `posterizeTime`-like); directional +
gaussian blur as transition assist; precomped UI with parented children; glow/gradient
blooms via masked gradient layers; heavy motion blur on whips and comets. [B]'s canvas
world-tour = one huge precomp navigated by camera keyframes. The meta storyboard bar in [A]
is a teaching overlay — a great internal pre-viz artifact.
