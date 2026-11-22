---
name: shanley-animate
description: Make a finished fashion or design animation for a vertical video from the Shanley Animations pack. Use when someone types /shanley-animate, or asks for a fabric or swatch comparison, a tech pack or measurement callout graphic, a moodboard or colour palette reveal, or a big-number statistic card for a short, reel or TikTok.
---

# Shanley Animations

The pack lives at `{{PACK}}`. Each animation is a finished, tested HyperFrames composition in the Shanley AI look (cream paper, mauve accents, Instrument Serif and Bricolage Grotesque). You change its words, numbers and colours; you do not redesign it unless the person asks.

## The animations

| Name | What it shows | Length |
|---|---|---|
| `swatch-compare` | Two pinned fabric swatches, compared row by row, then one is stamped as the pick | 6 s |
| `techpack-callouts` | A T-shirt flat draws itself on a spec sheet, then up to four measurements are called out | 7 s |
| `moodboard-pins` | Up to five colour or image cards drop onto a board and get pinned, then keyword tags | 6 s |
| `hangtag-stat` | A hangtag swings in on its string and a big number counts up, with a label and source | 6 s |

Run this to see every setting of every animation and its default:

```bash
node "{{PACK}}/scripts/make.mjs" list
```

## Effects on your own footage

Two editorial effects go onto a stretch of the person's talking-head video. The speaker is cut out on their computer, so type can sit behind their head. The original sound is kept.

| Name | What it does |
|---|---|
| `cover-masthead` | Magazine cover: a huge serif word behind the head, an issue line above it, a corner label, a barcode sticker and a caption box |
| `backdrop-word` | The room is replaced by a solid colour, with giant italic two-colour words drifting behind the speaker and a caption box |

```bash
node "{{PACK}}/scripts/effect.mjs" cover-masthead --video /path/to/take.mp4 --from 12 --to 16 \
  --set masthead=SHANLEY --set "caption=like a magazine *cover.*" -o /path/to/output/cover.mp4
```

1. **Find the moment.** Ask which seconds, or which spoken words, the effect should cover. Keep it under 20 seconds; 2 to 5 is typical.
2. **Look at a frame first.** Pull one frame of that stretch with ffmpeg and find where the top of the head is. Set `mastheadY` so the big word crosses the top of the head (it is a percent from the top of the frame). For `backdrop-word`, set `phraseY` so the words sit above the head.
3. **Run it, then read the frames.** Each run takes about a minute. Check that the word is behind the head and still readable, that the caption box does not cover the face, and that nothing sits in the bottom fifth or the right edge, where the apps put their buttons.
4. **Colours.** Both effects use the forest look from her "Editing with Claude" video by default (see the `shanley-style` skill). Pass `--set look=plum` for the site colours. `cover-masthead` also takes `overline`, a small italic line resting on the big word.
5. **Captions.** The caption box holds one line for that moment. Leave `caption` empty if the video already has captions.

## The Shanley editorial look

Use these rules for anything new you build in this pack, so everything reads as one brand.

- **Type.** Instrument Serif for the big words and captions, italic for emphasis. Bricolage Grotesque, weight 800, for short bold lines. Geist Mono, uppercase with wide letter spacing (0.3em), for small labels and issue lines.
- **Colour.** Cream `#faf7f2` type on dark, ink `#1a1a1a` type on cream. Mauve `#7b4f72` is the accent on light grounds; blush `#dcb9d3` is the accent on dark. Deep plum `#2e1a2b` for backdrops and caption plates.
- **Placement.** One oversized element per frame, and it may run off an edge. Small mono labels sit top left. The big word goes behind the head. Captions sit in a plum box around 70 percent down, centred, with the word not yet spoken set lighter.
- **Details.** Print cues such as a barcode sticker, an issue number, pins, stitching and paper grain. Use one or two per frame.
- **Motion.** Things arrive quickly and settle; nothing loops or bounces for long. Cut out on the beat; no fade-outs.

## How to make one

1. **Pick the animation.** If the person named one, use it. If they described a need, suggest the closest one or two and say why.
2. **Collect the content.** Ask only for what is missing. Never invent a statistic, a price, a measurement or a source: if the person has not given a real number, ask for it. `hangtag-stat` must carry a true `source` line, or an empty one if the number is the person's own.
3. **Render a draft** and look at it before showing it:

    ```bash
    node "{{PACK}}/scripts/make.mjs" hangtag-stat --quality draft \
      --set number=3x --set unit= --set "label=more videos *posted*" --set "source=My own posting log, Oct to Nov 2026" \
      -o /path/to/output/hangtag.mp4
    ```

    Pull a few frames with ffmpeg and read them. Check that no text is cut off, wraps badly or overlaps. Long words need shorter copy, not smaller type.
4. **Render the final** with `--quality looks` (the default) once the draft is right, and give the person the file path.

## Settings

- `--set key=value` changes one setting. Quote any value with spaces.
- In titles and labels, wrap a word in `*stars*` to set it in italic mauve.
- Lists use `|` between items; `callouts` and `cards` use `;` between entries and `|` inside each.
- A `moodboard-pins` card takes `Label|#hexcolour` or `Label|/absolute/path/to/image.jpg`.
- `--transparent` saves a `.mov` with a see-through background for laying over footage. The cream paper background is part of the look, so use this only when asked.
- Every animation is 1080x1920 at 30 fps.

## Placing one into a video

To lay an animation over or into a talking-head video, render it first, then use ffmpeg. Keep the person's original audio untouched. Ask where it should land (a time, or a spoken word) and whether it should fill the frame or sit in the top half.

## Adding a new animation

A new animation is one HTML file in `{{PACK}}/compositions/`. Copy the structure of an existing one: link `../assets/brand.css`, declare the settings in `data-composition-variables`, put the scene inside `<div class="stage">`, and register one paused GSAP timeline on `window.__timelines` under the composition id. Use only deterministic motion (no `Math.random()`, no clocks). Run `npm run check` in the pack folder, render a draft and look at the frames before calling it done.
