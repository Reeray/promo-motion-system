# Audio for launch animations — research, sources, and the house kit

Research pass (July 2026) into sound effects and background music for product-launch
animations, folded into this system's laws. Everything here serves one goal: **on-beat
rhythm as a property of arithmetic, not of nudging.**

The deliverables that came out of it:

| What | Where | Committed? |
|---|---|---|
| This research | `audio/RESEARCH.md` | yes |
| Synthesized house kit — 15 one-shots + 3 music beds | `public/sfx/kit-*.wav`, `public/music/bed-*.wav` | **no** (git-ignored; regenerate with `node scripts/craft-audio.mjs`) |
| The synthesizer (deterministic, `--verify`, `--prove`) | `scripts/craft-audio.mjs` | yes |
| Gathered CC0 picks — 20 curated Kenney files | `public/sfx/kn-*.wav` | **no** (git-ignored; re-import per §6) |
| ON-BEAT law | `skills/promo-motion-system/SKILL.md` | yes |

---

## 1 · The sound grammar of launch films

The reference school this library is built on ([C] "Introducing GPT-5.5", Apple/Linear
launches, the HF Logo Intro) uses a small, strict vocabulary. Sound-design guides for
motion graphics agree on the same set ([Pixflow](https://pixflow.net/blog/cinematic-whoosh-sound-effects/),
[BOOM Cinematic Motion](https://www.boomlibrary.com/sound-effects/cinematic-motion/),
[A Sound Effect — Motion](https://www.asoundeffect.com/sound-library/motion/)):

| Sound | Role | Our cue kind |
|---|---|---|
| **Whoosh** (bandpassed noise, pitch/pan arc) | anything that TRAVELS; speed of whoosh = speed of cut | `push-off-left` (X), `scale-up-cut` (fast Z zip) |
| **Impact / thock** (pitch-dropped sine + click) | anything that LANDS; the weight of an arrival | `scale-pop-in`, HF `dum`/`tek` |
| **Riser** (swelling noise/pitch) | tension INTO a beat; classically cut to silence one beat early | `kit-riser-*`, the driving-version gap |
| **Tick** (tiny filtered click) | per-item feedback: checklist rows, chip selections, typed chars | `ui-tick`, `ghost` |
| **Shimmer** (high filtered noise tail) | "quality residue" after a landing — the polish tell | tails inside `kit-pop`, `kit-glide`, `kit-accent` |
| **Bed** (music) | the grid everything else snaps to | `sound.music` |

Working rules the guides converge on, mapped to what our system already enforces:

- **Sound leads the eye by 10–20 ms** — audio is processed faster than visuals, so a hit
  that starts exactly on the visual frame reads slightly late
  ([Pixflow](https://pixflow.net/blog/cinematic-whoosh-sound-effects/)). Ours: cue times
  are derived from the motion, and the per-cue `nudge` (ms) is the sanctioned way to pull
  a hit 10–20 ms early where it reads late. That is what nudge is FOR.
- **Music first, then animate to the beats** — "it gives the feeling that the music was
  made just for this video" ([Fuel It Online](https://www.fuelitonline.com/blogs/sound-design-in-motion-graphics/)).
  Ours: §3's integer-frame BPM table makes beats and frames the same grid, so scene
  lengths can be authored in beats.
- **Whoosh speed = transition speed; whoosh trajectory = object trajectory.** Ours: the
  kit's `kit-whoosh-out` PANS left because `push-off-left` throws left; `kit-glide` pans
  right→center because `glide-in` arrives from the right. Sound follows motion, in stereo.
- **Fewer, better-placed sounds beat wall-to-wall foley.** UI-sound practice says subtle
  and informative, never dominant ([UXmatters](https://www.uxmatters.com/mt/archives/2024/08/the-role-of-sound-design-in-ux-design-beyond-notifications-and-alerts.php),
  [uisfx.com](https://uisfx.com/ui-sound-design)). Ours: `MIX_BUDGET = 4` is a measured
  ceiling, and the C1 gate counts overlap — restraint is enforced, not advised.

## 2 · Levels — the numbers that keep a mix honest

- **Delivery target: −14 LUFS integrated, −1 dBTP true peak.** YouTube normalizes down
  to −14 and never boosts; true-peak headroom survives the AAC/Opus transcode
  ([APU](https://apu.software/youtube-audio-loudness-target/),
  [LoudFix](https://www.loudfix.com/lufs-standard-youtube-2026/),
  [MixingGPT](https://mixinggpt.com/blog/how-to-mix-for-streaming-lufs-true-peak-2026)).
  Shorts/TikTok cuts run hotter (−10..−12) — export a louder variant rather than
  mastering the master hot.
- **One-shots: −15 dBFS sample peak each** (this repo's T26 calibration: `amix` is an
  unnormalized straight sum; 4 simultaneous −15 dBFS cues still clear clipping).
- **Beds: mastered like music** (ours measure −9.6..−10.2 LUFS, −1.5 dBTP), then leveled
  by token at mix time: `soft` = 0.18 (−14.9 dB) under everything, `normal` = 0.3
  (−10.5 dB). The bed also ducks to 0.45 under every cue window automatically.
- **Remotion renders stereo**; mono sources gain exactly +3.01 dB in the render but not
  in the Web Audio preview (measured in this repo) — supply STEREO files and preview ≡
  render.

## 3 · ON-BEAT — the frame arithmetic

At 60 fps, one beat = `3600 / BPM` frames. Music can only land every beat exactly on a
frame when that division is exact:

| BPM | frames/beat | bar (4 beats) | feel |
|---|---|---|---|
| 90 | 40 | 160f · 2.667s | calm, neo-classical pulse |
| 100 | 36 | 144f · 2.4s | relaxed product walkthrough |
| **120** | **30** | 120f · 2s | the house default — quiet confidence |
| 144 | 25 | 100f · 1.667s | brisk feature montage |
| **150** | **24** | 96f · 1.6s | driving launch energy |
| 180 | 20 | 80f · 1.333s | sting/teaser pace |

(160, 200, 225, 240 BPM also divide exactly but exceed launch-film pacing.)

**Workflow:** pick the bed first → author scene lengths in whole beats (`hold` tokens
already quantize larger than a beat at these tempos) → transition cues land on the grid
by construction → pull any hit that reads late 10–20 ms early with its `nudge`. The two
risers end in a **written silence** (last 40–50 ms shaped to zero) so a downbeat can land
in a gap — the HF driving-version trick, available as a sample.

## 4 · Licensing — what may live where

The public repo rule stands: **no third-party audio is ever committed.** What research
added is *why* each source class lands where it does:

| Source class | Commercial use | May sit in a PUBLIC repo? | Notes |
|---|---|---|---|
| **Our synthesis** (`craft-audio.mjs`) | yes — it's ours | the *script* yes; output stays git-ignored anyway | provenance = the script itself |
| **CC0** ([Kenney](https://kenney.nl/), [Freesound CC0 tag](https://freesound.org/browse/tags/cc0/), [ZapSplat CC0 subset](https://www.zapsplat.com/license-type/cc0-1-0-universal/), [Wikimedia](https://commons.wikimedia.org/wiki/Commons:Free_media_resources/Sound)) | yes, no attribution | legally yes — but we keep them git-ignored so the repo carries no binaries and no provenance doubt | modification allowed (our −15 dBFS re-master is fine) |
| **Free-license libraries** ([Pixabay](https://pixabay.com/service/license-summary/), [Mixkit](https://mixkit.co/license/)) | yes, in a video | **NO** — standalone redistribution is expressly forbidden | use in renders freely; never commit the files |
| **Subscription** (Epidemic, Artlist, [Storyblocks](https://www.storyblocks.com/audio/search/background-music-for-product-launch-video), [MelodyLoops](https://www.melodyloops.com/music-for/technology/)) | while subscribed | NO | license dies with the subscription — record track IDs in the doc, not the files |
| **AI-generated** | plan-dependent | NO | [Suno/Udio](https://www.digitalapplied.com/blog/ai-music-generation-platforms-suno-udio-elevenlabs-2026): commercial rights on PAID plans only, label settlements late 2025; [ElevenLabs Music](https://www.aimagicx.com/blog/suno-vs-udio-vs-elevenlabs-music-comparison-2026) is the licensing-first option (trained on cleared data); AIVA Pro assigns copyright. Treat like library audio: use, don't commit. |

## 5 · The house kit (synthesized, `scripts/craft-audio.mjs`)

Every one-shot is cut to its cue kind's EXACT slot (`CUE_MS`), mastered to −15 dBFS,
DC-blocked and demeaned, 48 kHz stereo, byte-deterministic (`--prove`):

| File | ms | For | Character |
|---|---|---|---|
| `kit-tick` / `kit-tick-soft` | 60 | `ui-tick` | keycap thock / softer high tick |
| `kit-rise` | 90 | `ui-rise` | small pitch-up lift with air |
| `kit-swap` | 180 | `ui-swap` | out-click → in-thock, two events one gesture |
| `kit-zip` | 100 | `scale-up-cut` | tight zip, brightens toward the lens |
| `kit-whoosh-out` | 150 | `push-off-left` | whoosh that PANS left with the throw |
| `kit-glide` | 900 | `glide-in` | long swell, lands at the settle (~60%), pans R→C |
| `kit-pop` | 430 | `scale-pop-in` | thump + click + shimmer — the logo-lands pop |
| `kit-accent` | 1000 | `custom` | neutral boom + long shimmer for user-placed cues |
| `kit-riser-500/-1000` | 500/1000 | into a downbeat | end in written silence (40–50 ms) |
| `kit-drum-dum/-tek/-ghost` | 160/90/50 | HF ending, accent tiers ≥.9 / .5–.9 / <.5 | the handoff spec's synthesis, verbatim |
| `kit-drum-dum-deep` | 195 | the HF logo downbeat | dum at 0.82 rate, pre-rendered (cues have no rate param) |

**The v1 beds are the GOLDEN STANDARD** (user judgment, July 2026): smooth, simple, sparse.
A "v2" with sidechain pumping, fills, reverb and string plucks was built, measured better on
paper (stereo width, crest), and rejected by ear — production layering competes with the
picture. Propose bed changes as new variants beside the standard, never as replacements.

Beds (`public/music/`), all on the frame grid per §3, −1.5 dBTP:

**The shelf** (curated by ear, July 2026): `bed-pulse-120` — the ONE surviving standard and
the reference sound — plus the current warm-lofi candidates. calm-90 and drive-150 were
rejected by the user, as were: a 7-variant tempo/harmony/instrumentation sweep (too fast /
weird) and a minor-key lofi pair (Dm7→G7→Cmaj7→Am7 — SAD: a loop that begins and ends minor
reads melancholy by construction; never build beds on minor-heavy progressions).

| bed | what it is |
|---|---|
| `bed-pulse-120` | the golden standard, untouched (hash d45eadf3…) |
| `bed-warm-120` | lofi vamp on C6→Fmaj7 (E/A/C shared, only G↔F moves), bright Rhodes-ish keys, crackle floor, ticks on EVERY beat |
| `bed-warm-swing-120` | the same, swung: triplet eighths at beat+20f exact, laid-back kick, walking fifths |

**The swing arithmetic:** at 120bpm a beat is 30 frames, so a swung (triplet) eighth lands at
beat + 20 frames EXACTLY — grid-legal wherever frames-per-beat divides by 3. Beats stay
metronomic ALWAYS (the user's stated taste: constant beat ticks across the whole piece).

The v1 CANON the variants obey: the grid is the composer (no swing, no humanization) · a bed
is a floor, not a story (one loop, no fills, no development) · few voices, one job each ·
simple timbres · nothing clicks · energy via instrumentation, never intensity · static mix
(no reverb, no sidechain — space and dynamics belong to the VIDEO mix) · deterministic.

`--verify` re-measures every claim above (slot fit, ceiling, DC, grid); `--prove`
generates twice and compares bytes.

## 6 · Gathered CC0 (Kenney, re-importable)

Four packs fetched from [kenney.nl](https://kenney.nl/assets/category:Audio) (CC0):
Interface Sounds (100), UI Audio (50), Impact Sounds (130), Music Jingles (85) — zips
cached in `.cache-audio/`. Twenty launch-relevant files were curated into
`public/sfx/kn-*.wav`, converted to 48 kHz stereo s16 and normalized to the −15 dBFS
ceiling (CC0 permits modification): clicks, selects, switch/toggle, confirm, open/close,
maximize/minimize, tick, pluck, drop, scroll, rollover, mouseclick, two soft thumps, a
knock. Footsteps and 8-bit jingles were skipped — wrong aesthetic for launch films.
The import commands live in the git log of this file's commit.

## 7 · What was deliberately NOT done

- **No auto-fill.** The kit is listed by the editor's pickers; nothing assigns a file to
  a cue or a bed to a doc. Placing sound remains a user decision, per the standing law.
- **No committed audio.** Even our own synthesized output stays git-ignored — the
  committed artifact is the *generator*, which is smaller, diffable, and license-proof.
- **No AI-generated stems** in the kit: license terms are plan-dependent and in motion
  (see §4); the synthesized beds cover the placeholder-to-good range, and §4 names the
  clean paths when a doc needs a real score.

Sources: [Pixflow — whoosh craft](https://pixflow.net/blog/cinematic-whoosh-sound-effects/) ·
[Fuel It Online — sound in motion graphics](https://www.fuelitonline.com/blogs/sound-design-in-motion-graphics/) ·
[BOOM Library — Cinematic Motion](https://www.boomlibrary.com/sound-effects/cinematic-motion/) ·
[A Sound Effect — Motion libraries](https://www.asoundeffect.com/sound-library/motion/) ·
[UXmatters — sound in UX](https://www.uxmatters.com/mt/archives/2024/08/the-role-of-sound-design-in-ux-design-beyond-notifications-and-alerts.php) ·
[uisfx — UI sound design guide](https://uisfx.com/ui-sound-design) ·
[APU — YouTube loudness](https://apu.software/youtube-audio-loudness-target/) ·
[LoudFix — 2026 LUFS standard](https://www.loudfix.com/lufs-standard-youtube-2026/) ·
[MixingGPT — streaming loudness](https://mixinggpt.com/blog/how-to-mix-for-streaming-lufs-true-peak-2026/) ·
[Kenney assets](https://kenney.nl/assets/category:Audio) ·
[Freesound CC0](https://freesound.org/browse/tags/cc0/) ·
[ZapSplat CC0](https://www.zapsplat.com/license-type/cc0-1-0-universal/) ·
[Wikimedia free sound](https://commons.wikimedia.org/wiki/Commons:Free_media_resources/Sound) ·
[Pixabay license](https://pixabay.com/service/license-summary/) ·
[Mixkit license](https://mixkit.co/license/) ·
[Storyblocks](https://www.storyblocks.com/audio/search/background-music-for-product-launch-video) ·
[MelodyLoops — technology](https://www.melodyloops.com/music-for/technology/) ·
[Digital Applied — AI music platforms 2026](https://www.digitalapplied.com/blog/ai-music-generation-platforms-suno-udio-elevenlabs-2026) ·
[AI Magicx — Suno vs Udio vs ElevenLabs](https://www.aimagicx.com/blog/suno-vs-udio-vs-elevenlabs-music-comparison-2026)
