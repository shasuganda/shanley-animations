---
name: shanley-style
description: Apply Shanley's signature look, the one from her "Editing with Claude" video (forest green ground, cream Instrument Serif type, one yellow accent word, small spaced-out mono labels, serif captions low on screen, title behind the head). Use when someone types /shanley-style, says "my style", "Shanley style", "the forest look" or "like my editing video", or starts a video edit, an animation, a title card, a document or a page that should match her videos.
---

# The Shanley style

This is the look Shanley approved, note by note, on her "Editing with Claude" video (21 November 2026). Treat it as the default for anything made for Shanley AI video content. Her site keeps its own cream and mauve colours; this look is for video and for things that go with her videos.

The finished "Editing with Claude" video is the reference. Stills from it are in the setup guide at `{{PACK}}/guide/edit-video-with-claude.html`.

The exact stylesheet rules from that video are saved at `{{PACK}}/looks/forest-editorial.css`.

## Colour

| Role | Colour |
|---|---|
| Ground (full-screen graphics, backdrops) | forest green `#203028` |
| Blocks and cards on the ground | deeper green `#1a2821` |
| Caption bar, darkest blocks | `#14201a` |
| Hairlines and borders | `#3c5246`, `#3f564a` |
| Main type | cream `#f0e8e0` |
| Secondary type | `#d0d0c0` |
| Small labels | khaki `#b8b088` |
| Accent | warm yellow `#f5cf45` |

Rules she set in her own words:

- Forest green, not olive. She rejected the olive ground and the olive caption bar.
- The accent is yellow because the first version was "too tone down". Use it on one word per title, the last word of a caption, ticks and highlights. Never on a whole sentence.
- No ivory or white backgrounds, no clay or orange accent, no gradients, no drop shadows on cards.

## Type

- **Instrument Serif** for every title and every caption. Regular weight, sentence case, letter spacing about -0.01em.
- Titles are two-tone: cream words with one word in yellow ("The *truth*", "How it *works*", "Comment *edit*"). The yellow word is upright, not italic.
- Italic Instrument Serif in yellow is for a small line resting on a big title ("*Editing with*" above "CLAUDE").
- **JetBrains Mono**, medium, uppercase, letter spacing 0.22em to 0.3em, for small labels: "NO. 01 · NOVEMBER 2026 · EDITED BY CLAUDE", "STEP 01 OF 04", "EVERY VIDEO", "RAW TAKE 3:23". Numbered rows use "01", "02", "03" in mono.
- Inter only for interface text inside rebuilt app screens.

## Layout (1080 x 1920)

- **Split screen is the base**: graphics on the forest ground in the top half, her camera in the bottom half, a hard edge between them at the middle. No fades, no rounded camera frame.
- **Full-screen graphic** for a big line (a title card, the call to action), 2 to 5 seconds.
- **No full-screen shot of her face**, with one exception: the opening hook, where the title sits behind her head (see below).
- Titles sit top left or centred in the top half, with a mono label above them and thin hairlines between list rows.
- Corners are nearly square (4 px). Blocks are flat.

## Captions

- A serif bar, not a mono chip: cream Instrument Serif on a `#14201a` bar with a faint 1 px cream outline, sentence case, two or three words at a time.
- The last word of a sentence is yellow.
- **Low on the screen**, over her chest (about 85 to 90 percent down). She asked for the text at the bottom, not at the top or on the seam.

## The opening hook

Her whole frame, with a title between the room and her: mono issue line, a small yellow italic line, then one huge cream serif word that her head overlaps. Build it with the pack's effect:

```bash
node "{{PACK}}/scripts/effect.mjs" cover-masthead --video /path/to/take.mp4 --from 0 --to 5 \
  --set masthead=CLAUDE --set "overline=Editing with" \
  --set "issue=No. 01|November 2026|Edited by Claude" \
  --set kicker= --set kickerTitle= --set barcode= --set caption= -o /path/to/hook.mp4
```

Look at a frame first and set `mastheadY` so the big word crosses the top of her head.

## Graphics vocabulary

Plain, flat, typographic. Things that appeared in the video and are approved:

- two-tone serif title cards with a mono label
- numbered serif lists with hairlines ("01 Cutting every pause")
- simple cream bars that grow to compare two lengths (filming vs editing)
- a week strip of day names with one day boxed
- her own clips and photos in square-cornered plates with a mono tag
- real screenshots of a product page in a plate
- a row of green blocks standing for the video's beats, with one changing

Avoid 3D objects, glows, emoji, stock icons and busy backgrounds.

## Motion and sound

- Things arrive fast and settle. Hard cuts between layouts. Nothing bounces or loops.
- Something changes about once a second; no graphic sits still for more than about 2.5 seconds.
- Voice: she asked for it "more clear and soothing". Light clean-up and level to about -16 LUFS; keep it natural.

## Using it in a claude-edit run

claude-edit starts in its own default ivory look. To get this one, tell the run in Shanley's words: "Use my forest editorial look: forest green ground, cream Instrument Serif, yellow accent word, serif captions at the bottom, split layout, no full-screen face except the hook." Then:

1. Append `{{PACK}}/looks/forest-editorial.css` after the default rules in that run's `tools_local/style.css`, and copy the Instrument Serif font files into the run's fonts folder (they are in `{{PACK}}/assets/fonts/`).
2. Set every caption to the low position.
3. Build the hook with the effect above and use it as the first beat.
4. Record in the run notes that the look came from this skill.

Do not edit claude-edit's shared style files; change only the run's own copies.

## Using it elsewhere

- **Pack effects**: `cover-masthead` and `backdrop-word` use this look by default (`look=forest`). Pass `--set look=plum` only for site-coloured pieces.
- **Pages, guides and documents**: forest ground, cream text, yellow for one emphasised word per heading and for key numbers, mono uppercase labels above sections, hairlines instead of boxes. Fonts load from Google Fonts as Instrument Serif, JetBrains Mono and Inter.
- **Thumbnails and stills**: a frame of her with the big serif word behind her head, or a full forest card with a two-tone title.
