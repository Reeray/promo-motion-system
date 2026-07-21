# promo-motion-system

A motion-design system for AI/tech product promo and brand-launch videos, packaged as an
[Agent Skill](https://docs.anthropic.com/en/docs/claude-code/skills) plus a live Remotion
reference library.

**Live preview: https://reeray.github.io/promo-motion-system/** — every primitive as a
scrubbable Remotion player.

## What's here

| Path | What it is |
|---|---|
| [`skills/promo-motion-system/SKILL.md`](skills/promo-motion-system/SKILL.md) | The full skill: 3 effort-tier blueprints, 15-transition catalog, 40+ named primitives, measured timing charts, intake questionnaire, pre-production contract |
| [`motion-library/`](motion-library) | Remotion project reproducing 12 signature primitives with the measured timings |
| [`docs/`](docs) | Built preview site (GitHub Pages) — the block library, nothing else |

## The system in one paragraph

Three reference films were reverse-engineered frame-by-frame (with per-frame motion-energy
profiling to fingerprint easing): **[A]** Oleg Gyulumian's "structure > visuals" Prism AI
tutorial (quick tier), **[C]** an OpenAI-school "Introducing GPT-5.5" capability
announcement (medium tier — the house standard), and **[B]** Alex Socoloff's jurni brand
launch (high tier). The skill routes by tier, scopes the video with a 9-question intake,
produces a storyboard treatment for approval, then builds with Remotion using the
primitives in this library.

## Install

**This repo is two halves, and the skill alone is only the first one.**

`SKILL.md` is the *design layer* — blueprints, the transition catalog, measured easing curves,
the capture and storyboard gates. It tells an agent **what** to build. It does not contain a
renderer. The *build layer* is `motion-library/` — the Remotion project, the blocks, and the two
gates the skill refers to as laws. Installing the skill without it gives you a director with no
camera: the skill will reference `npm run check` and `src/lib/ease.ts`, and you won't have them.

```bash
# 1. the design layer (the skill itself)
npx skills add Reeray/promo-motion-system

# 2. the build layer — required for anything that renders
git clone https://github.com/Reeray/promo-motion-system
cd promo-motion-system/motion-library && npm install
```

Everywhere the skill says `src/…`, it means `motion-library/src/…` from this repo.

### Prerequisites

| Need | Why | Note |
|---|---|---|
| **Node 20+** | Remotion + the Vite site | first `npm install` pulls ~400 MB |
| **A headless Chrome** | Remotion renders in a browser | auto-downloaded on first render (~150 MB) |
| **Python 3 + OpenCV** | the post-render pixel gate | `pip install -r motion-library/requirements.txt` |
| **Network at render time** | fonts load via `@remotion/google-fonts` | offline renders silently fall back to system fonts |

ffmpeg is **not** required — Remotion bundles it.

### Companion skills

The skill hands off to these by name. Only the first is required to ship a video:

| Skill | Role | Required? |
|---|---|---|
| `feature-promo-animation` | the build/render layer the treatment hands off to | **yes**, for rendering |
| `live-page-replica` | capturing public pages for §0.6 | optional |
| `figma-to-code` | unshipped designs | optional |

### Using a tool other than Claude Code

The design system is portable — any agent can apply it. Two steps assume Anthropic tooling and
have documented fallbacks in `SKILL.md`: **§0.6 capture** (driving your logged-in browser) and
**intake** (a structured question UI). Without browser automation you run the capture snippet in
your own devtools and paste the result; the skill says which fidelity checks you then cannot meet.

## Run the library locally

```bash
cd motion-library
npm install
npm run studio       # Remotion Studio — scrub the reel composition
npm run site:dev     # the block-library preview site
npm run render       # render the block reel (~12s) to out/motion-library.mp4
npm run check                              # static gate — run BEFORE rendering
npm run check:render out/motion-library.mp4  # pixel gate — takes the file explicitly
```

## Licence

MIT for this repo's own code — see [LICENSE](LICENSE). **Remotion is not MIT**: it is free for
individuals and small companies but larger companies need a paid Company Licence, and cloning
this repo does not grant you one. Check <https://remotion.pro/license> before rendering
commercially.

## Credits

Motion patterns studied from public work by Oleg Gyulumian, Alex Socoloff, and OpenAI's
announcement film language. This repo reimplements the *techniques* (curves, timings,
choreography) as original code for study and reuse — no source footage is included.
