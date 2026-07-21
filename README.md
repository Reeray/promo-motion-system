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

## Install the skill

```bash
npx skills add Reeray/promo-motion-system
```

Or copy `skills/promo-motion-system/` into your project's `.claude/skills/`.

## Run the library locally

```bash
cd motion-library
npm install
npm run studio       # Remotion Studio — scrub the reel composition
npm run site:dev     # the preview site with per-primitive players
npm run render       # render the block reel (~12s) to out/motion-library.mp4
```

## Credits

Motion patterns studied from public work by Oleg Gyulumian, Alex Socoloff, and OpenAI's
announcement film language. This repo reimplements the *techniques* (curves, timings,
choreography) as original code for study and reuse — no source footage is included.
