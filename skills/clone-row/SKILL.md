---
name: clone-row
description: Put a row of copies of the speaker behind them on their own talking-head video, stepping out to the right and left on a spoken word and moving in step with them. From the Shanley Animations pack. Use when someone types /clone-row, or asks for a clone row, clones, copies or duplicates of themselves, "more of me", or "an army of me" behind them in a short, reel or TikTok.
argument-hint: [video] [when it should happen] [how many copies]
---

# /clone-row

Copies of the speaker step out from behind them, one after another, to the right and left. They are cut out of the same footage, so they talk and move in step with the speaker. The original sound is kept. The result is the treated stretch as a 1080x1920 mp4.

Request: $ARGUMENTS

```bash
node "{{PACK}}/scripts/effect.mjs" clone-row --video /path/to/take.mp4 --from 10 --to 13 \
  --set clones=4 -o /path/to/output/clone-row.mp4
```

## How to make one

1. **Find the moment.** Ask which seconds or which spoken words it should cover, if the person has not said. It suits a line about doing many things at once, a team, or "all of these". 2 to 4 seconds is typical; 20 is the limit. Start the stretch about a third of a second before the word it should land on, or set `at` to the word's time inside the stretch.
2. **Look at a frame first.** Pull one frame of the stretch with ffmpeg. The copies need room beside the head: if the head fills most of the width, use `clones=2` and a smaller `scale`, and say so plainly. A plain or dark room hides the copies' edges best.
3. **Run it** (about half a minute for three seconds), then **read the frames** before showing it. Pull four or five frames across the stretch into one sheet with ffmpeg and check:
   - the copies' heads sit beside the speaker's head, not hidden behind their hair or shoulders (raise `spread`)
   - no copy covers the speaker's face, and none is cut in half by the frame edge in a way that looks like a mistake (lower `spread` or `clones`)
   - the copies' heads are level with each other and a little below the speaker's (`drop`, or `headY` if the head was found wrongly)
   - nothing important sits in the bottom fifth or along the right edge, where the apps put their buttons
4. Give the person the file path. It is a draft for them to approve.

## Settings

Pass each with `--set key=value`.

| Setting | What it changes | Default |
|---|---|---|
| `clones` | How many copies, 1 to 8. They alternate right, left, right, left | 4 |
| `scale` | Size of the nearest pair, as a percent of the speaker | 62 |
| `falloff` | Each pair further out is this percent of the pair before | 86 |
| `spread` | How far apart the copies stand, in pixels | 250 |
| `at` | Seconds into the stretch when the first copy steps out | 0.3 |
| `stagger` | Seconds between one copy and the next | 0.12 |
| `out` | Seconds before the end when the copies step back in. 0 means they stay until the cut | 0 |
| `drop` | How far the copies' heads sit below the speaker's, in pixels | 30 |
| `dim` | Darken the copies by this percent per pair, for depth | 0 |
| `headY` | Top of the speaker's head as a percent from the top. Empty means it is found from the cut-out | empty |

Use `out=0.4` when the stretch goes back into the same continuous shot, so the copies step away instead of vanishing. Leave it at 0 when the next thing is a hard cut to a graphic.

## Putting it into the full video

The file covers only the stretch. To place it in the full video, replace that stretch's picture with ffmpeg and keep the full video's own audio untouched. In a claude-edit run, use it as the clip for that beat.

## Style

This effect carries no type or colour, so it works with any look. If the person wants a caption or a title over it, follow the `shanley-style` skill.

For the other effects in the pack (doors, slice, shockwave, banknote and the rest), use the `shanley-fx` skill.
