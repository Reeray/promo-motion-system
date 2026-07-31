# THE SCORE FORMULA — background music that adapts to the animation

The goal, stated by the user: a reusable formula for creating best-fitting background music
whose rhythm adapts to the animation. This file is that formula — the parts settled by
listening verdicts, and the one slot still open, with its live hypotheses.

Everything here is implemented in `scripts/compose-score.mjs`, which reads a promo doc's own
derived timeline (`prepare()` + `cues()`) and writes a WAV exactly `durationInFrames` long.

## The settled parts (do not re-litigate without a new verdict)

1. **The grid is the clock.** The doc declares `grid.bpm` from the integer-frames-per-beat
   table (RESEARCH §3). Every cut sits on a beat by construction; the score is composed on
   the same grid, so alignment is arithmetic.
2. **The groove skeleton** (from `bed-pulse-120`, the only bed that ever survived): kick on
   1 & 3, rim backbeat on 2 & 4, the beat tick on EVERY beat of every body scene — never
   dropping out — with shaker 8ths breathing under. Constant, metronomic, no fills.
3. **Logo sections: the animation is the metronome.** No groove there. Percussion lands on
   the surface's published keyframe hits (kick/rim/tick by accent tier). The visual rhythm
   and the musical grid must never run simultaneously.
4. **Sections adapt by subtraction, not intensity.** The CTA drops the kick. Framing scenes
   are sparser than the content scene. Louder/busier = rejected, twice.
5. **The ending resolves ON the picture.** Groove stops at the boundary (written silence),
   the hit-rhythm returns, and the final chord (or unison hit) lands on the logo downbeat,
   sized to the remaining time, 250ms cosine tail to true zero at the last frame.
6. **Major-warm palette only.** C6/Fmaj7 school. A loop that begins and ends minor reads
   sad (measured against the rejected pair). No minor-bounded progressions.
7. **Levels/format:** stereo 48k, master −1.5 dBFS, played at `level: "normal"` with
   `fade: "none"` (a score authors its own opening and ending).
8. **Deterministic.** Same doc + mode → same bytes. Regenerate after ANY doc timing change.

## The open slot: what the PITCHED layer is

**Rejected:** a foreground melody. Three attempts (slow phrases; denser phrases; re-voiced
bell lead) all failed the same way — a line you follow competes with the picture. The pitch
must serve the rhythm or the structure, never sing over them.

**Live hypotheses** (`--pitched=<mode>`, all over the identical bed, A/B'd July 2026):

| mode | pitch's role | claim |
|---|---|---|
| `ostinato` | pitch AS rhythm — sequencer broken-chords locked to the ticks; 8ths in the content scene, quarters in framing scenes | interest comes from motion-in-the-grid, with no line to follow |
| `bassline` | the movement lives in the BASS — walking root-fifth-sixth under static pads | melody-hunger is satisfied low, where it cannot compete |
| `breath` | negative space — one chord bloom per scene CUT, rest elsewhere | harmony marks the structure; the picture keeps the foreground |
| `harmonic` | the harmony IS the melody — per-scene chord colours changing at the cuts (title Cmaj7 → content vamp → payoff F6 → cta G → ending resolve to C) | the "tune" is the journey of colours, synced to the story |

**VERDICT: __________________ (fill on the user's pick; the winner gets locked into the
formula as rule 9 and the losing modes stay as flags, not defaults.)**

## Using the formula on any promo

```
1. author the doc with grid.bpm from the table (music first, scenes in whole beats)
2. node scripts/compose-score.mjs docs/<name>.promo.json --pitched=<winning mode>
3. doc: "music": {"src": "music/score-<id>-<mode>.wav", "level": "normal", "fade": "none"}
4. re-run step 2 after any timing change — a score is a derived artifact of the timeline
5. cue slots stay empty/user-filled as ever; the bed ducks only under FILLED cues
```
