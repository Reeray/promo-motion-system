# Generation prompt — background music for launch animations

Distilled from the session's listening verdicts (see RESEARCH.md §5 and the bed shelf):
`bed-pulse-120` is the reference sound; harmony must be major-warm, never minor-bounded;
the beat-marking ticks run constant on every beat; no production layering.

## Main prompt (warm lofi groove)

> Instrumental lofi-jazz groove for a tech product launch video. Exactly 120 BPM, 4/4,
> C major, steady from the first bar to the last. The rhythm is the star: a soft round
> kick, a woody rim-click backbeat on 2 and 4, and a crisp hi-hat tick marking every
> quarter-note beat of the entire track — metronomic, never dropping out, no fills, no
> drum rolls. Gentle shaker eighth-notes breathing underneath. Harmony stays sparse and
> warm: soft Rhodes electric piano playing a simple two-chord major vamp (C6 to Fmaj7),
> one relaxed chord per bar, no melody line, no solos. A touch of vinyl crackle for
> warmth. Mood: calm, sunny, quietly confident — background music that supports
> on-screen motion without demanding attention. Loop-like structure: no intro build-up,
> no drops, no risers, no transitions — the first bar sounds like the last. Clean mix,
> soft low end, no sidechain pumping, no reverb washes, no vocals.

## Variant: pure beat map

Replace the harmony sentence with:

> No chords, no melody, no bass line — percussion only: the kick's low thump is the only
> bass. A head-nod pattern (boom on 1, a lighter answering kick on the and-of-3) under
> the constant beat ticks.

## Negative prompt / avoid list

vocals, singing, minor key, melancholy, EDM drop, build-up, riser, sidechain pumping,
heavy reverb, tempo changes, drum fills, fast tempo, aggressive, cinematic swell.

## Short style tags (Suno-style tag fields)

`lofi jazz, instrumental, 120 BPM, steady beat, minimal, warm, sunny, product demo, no vocals`

## After generation — three checks the prompt cannot enforce

1. **BPM exactly 120.** Generators drift; the ON-BEAT law assumes a beat = exactly 30
   frames at 60fps. If the file measures 119.x, time-stretch to true 120 before use.
   (Grid-legal alternates if a tool insists: 90, 100, 150 — see RESEARCH.md §3.)
2. **First downbeat at 0:00.** The bed starts at frame 0 of the composition; trim any
   pickup or leading silence so beat 1 is the first sample.
3. **License + repo rule.** Commercial rights require a paid plan (Suno/Udio; ElevenLabs
   Music is the licensing-first option). The file NEVER gets committed — drop it on the
   editor's music row; `public/music/` is git-ignored (RESEARCH.md §4).
