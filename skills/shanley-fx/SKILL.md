---
name: shanley-fx
description: Put one of 74 effects on the speaker's own talking-head video, landed on a spoken word, from the Shanley Animations pack. Room doors, blade slice, dolly zoom, clone row, incoming call, day dial, search bar, live cursor, comment drop, code body, voice note, shockwave, double exposure, head stack, rack focus, banknote, layer explode, impact frame, newspaper front page, paper tear, blow away, magazine cover, backdrop word, plus a second set of 51 (orbit, spotlight, LED sign, checklist, to-do, tier list, reject stamp, countdown, scribble, glass widgets, iMessage pop-ups, iPhone toggles, graphs, reel carousel, timeline, colour grades and more). Use when someone types /shanley-fx, or asks to add an effect, a transition or a "behind my head" moment to their own clip, or names one of these effects.
argument-hint: [effect] [video] [when it should happen]
---

# /shanley-fx

Effects for a stretch of the speaker's own vertical video. They are cut out of the shot on their computer, so things can sit behind them. The original sound is kept. The result is the treated stretch as a 1080x1920 mp4.

Request: $ARGUMENTS

```bash
node "{{PACK}}/scripts/effect.mjs" <effect> --video /path/to/take.mp4 --from 10 --to 13 --set key=value -o /path/to/out.mp4
node "{{PACK}}/scripts/effect.mjs" list     # every effect with every setting and its default
```

## The effects

| Effect | What happens | Lands on |
|---|---|---|
| `room-doors` | The room behind them opens like two doors onto a colour, picture or video (`reveal`) | "let me show you", a reveal |
| `blade-slice` | A blade flashes across and the two halves of the shot slip apart | "cut", one sharp word |
| `dolly-zoom` | The room rushes forward while they stay the same size | A realisation, a slow line |
| `clone-row` | Copies of them step out behind, right and left | "all at once", a team |
| `incoming-call` | A call card drops in, rings and is picked up (`caller`) | "then Claude called" |
| `day-dial` | A dial of days, or any list, spins behind the head and lands on one (`items`, `pick`) | A day, a choice, a number |
| `search-suggest` | A search bar types their question and suggestions drop down (`query`, `suggestions`) | A question people ask |
| `live-cursor` | A named cursor drags a selection box around their head | Design or editing talk |
| `comment-drop` | The comment they are answering drops in above them (`user`, `comment`) | Answering a viewer |
| `code-body` | Their silhouette fills with scrolling code (`code` takes a text file) | "it's all code" |
| `voice-note` | A voice-note card whose waveform is their real voice | A confession, an aside |
| `shockwave` | A ring bursts out from them and bends the room | One big word |
| `double-exposure` | A picture or video shows inside their silhouette (`image`, needed) | A memory, a place, a mood |
| `head-stack` | Copies of their head rise and stack upward | "so many ideas" |
| `rack-focus` | Focus pulls from the room to them, or back (`to`) | The start of a serious line |
| `banknote` | They become the engraved portrait on a banknote (`value`, `title`) | Money talk |
| `layer-explode` | The shot pulls apart into three labelled layers | Explaining how it is made |
| `impact-frame` | Negative flash, ink-and-speed-lines frame, hard punch-in | The punchline |
| `press-front` | They become the picture on a newspaper front page (`paper`, `headline`) | News, an announcement |
| `paper-tear` | A strip of the room rips away behind the head with words in it (`word`) | A title, "the truth" |
| `blow-away` | They break into dust and blow off (`mode=in` gathers them instead) | A sign-off, "gone" |
| `cover-masthead` | Magazine cover with a huge word behind the head | The opening hook |
| `backdrop-word` | The room becomes a flat colour with giant words behind them | A key phrase |

## How to make one

1. **Pick the effect and the moment.** Match their words to the table, or show it and ask. Ask which seconds or which spoken words it should cover. 2 to 4 seconds is typical; 20 is the limit. Most effects take `at`: the seconds into the stretch when it happens. Put `at` on the word.
2. **Look at a frame first.** Pull one frame of the stretch with ffmpeg. Cards (`incoming-call`, `comment-drop`, `search-suggest`, `voice-note`) sit in the top of the frame and need clear space above the head; move them with `y`. `day-dial`, `head-stack` and `paper-tear` need headroom too. If the head is near the top, say so and suggest another effect.
3. **Use their real content.** Real comment and commenter, real question, real headline. Never invent a statistic, a quote or a name. `comment-drop` and `press-front` ship with placeholder words: always replace them.
4. **Run it, then read the frames** before showing it. The first run on a stretch takes about a minute for the cut-out; after that, new settings on the same stretch take seconds. Pull four or five frames into one sheet with ffmpeg and check:
   - nothing covers their face that should not
   - things meant to be behind the head are behind it and still readable
   - text is not cut off or wrapped badly (shorten the words, do not shrink the type)
   - nothing important is in the bottom fifth or along the right edge, where the apps put their buttons
   - the moment lands on the word
5. Give them the file path. It is a draft for them to approve.

## Things to know

- **The empty room.** `room-doors`, `dolly-zoom`, `rack-focus`, `layer-explode` and `blow-away` need the room without the speaker. It is filled in from the pixels around them, which leaves a soft patch where they were. That is hidden while they stand in front of it. In `blow-away` it shows once they are gone: for a clean result pass `--set room=/path/to/photo-of-the-empty-room.jpg`, shot from the same spot.
- **`head-stack`** needs `headH`, the head's height as a percent of the frame. Measure it on the frame.
- **`double-exposure`** has no default picture. Ask for one.
- **Staying or leaving.** `clone-row`, `room-doors`, `head-stack`, `code-body` and `double-exposure` take `out`: seconds before the end when the effect steps away. Use it when the stretch runs on into the same shot; leave it at 0 before a hard cut.
- **Colours.** The drawn effects use the forest look from the `shanley-style` skill. `--set look=plum` gives the site colours.
- **Several effects in one video.** Render each stretch on its own; they must not overlap in time.

## The second set: 51 more effects

The pack also carries a second set of 51 effects in `{{PACK}}/vendor/claude-video-effects`, by Vibha Ramprakash (MIT licence, kept in that folder). They run on a different engine (Python, with face tracking), take a whole video and a plan of several effects at once, and keep the original audio.

`noise`, `lineup`, `locked-on`, `orbit`, `lean-in`, `backdrop-word`, `spotlight`, `the-bill`, `moody`, `swipe`, `todo`, `comment-box`, `tap`, `pause-point`, `uninstall`, `reel-frame`, `shortcut-rain`, `reject-stamp`, `countdown-flip`, `rabbit-hole`, `cover-star`, `scribble`, `glass-widgets`, `red-collage`, `split-headline`, `pastel-word`, `check-pills`, `timeline`, `headline-box`, `profile-wall`, `tier-list`, `broll-split`, `phone-fan`, `dot-reveal`, `headline-wall`, `checklist`, `liquid-glass-graph`, `carousel-spin`, `match-cut`, `apple-toggles`, `led-sign`, `slow-push`, `over-the-shoulder-zoom`, `messages`, `place-in-grid`, `tape-label`, `select-resize`, `wave-trim`, `huge-strike`, `crayon-write`, `fan-build`.

When the request names one of these, or nothing in the first table fits:

1. Read `{{PACK}}/vendor/claude-video-effects/SKILL.md` for what each does, its options and the steps, and follow it. Every path in that file is relative to `{{PACK}}/vendor/claude-video-effects`.
2. If `{{PACK}}/vendor/claude-video-effects/.venv` is missing, run `bash scripts/setup.sh` in that folder once.
3. Check stills before the full render, as that file says, and read them yourself.

Both sets render in Shanley's forest look. The second set gets it from `scripts/forest_look.py` in that folder; `--style original` on an `fx.py` command gives the look those effects shipped with. Where a name is in both sets (`backdrop-word`, and `cover-star` against `cover-masthead`), use the first set unless they ask for the other. Effects that show a profile name or handle default to the original author's: always pass the speaker's own (`name`, `handle`). Several effects that show reels need a folder of the speaker's own covers or clips (`images`); ask for it. Do not remove the licence files in that folder.

## Putting it into the full video

The file covers only the stretch. Replace that stretch's picture in the full video with ffmpeg and keep the full video's own audio untouched. In a claude-edit run, use it as the clip for that beat.

## Adding an effect

Effects are listed in `{{PACK}}/scripts/effects.mjs`. One that draws type or graphics is an HTML file in `compositions/` (copy `comment-drop.html`); one that changes the picture itself is a `run` function there. Never name a top-level variable `top`, `name` or `status` in a composition script: the browser already owns those names and the whole script fails without a message. Run `npm run check`, render it, and read the frames.
