# Shanley Animations

Fashion and design motion graphics for vertical video, made with Claude Code. You give the words, numbers and colours; you get a finished 1080x1920 clip in the Shanley AI look.

## The animations

| Name | What it shows | Length |
|---|---|---|
| `swatch-compare` | Two pinned fabric swatches, compared row by row, then one is stamped as the pick | 6 s |
| `techpack-callouts` | A T-shirt flat draws itself on a spec sheet, then up to four measurements are called out | 7 s |
| `moodboard-pins` | Up to five colour or image cards drop onto a board and get pinned, then keyword tags | 6 s |
| `hangtag-stat` | A hangtag swings in on its string and a big number counts up, with a label and source | 6 s |

## Effects on your own footage

Twenty-three effects go onto a stretch of your own talking-head video. In Claude Code, type `/shanley-fx` and say what you want.

| Name | What it does |
|---|---|
| `room-doors` | The room behind you opens like two doors onto a colour, picture or video |
| `blade-slice` | A blade flashes across and the two halves of the shot slip apart |
| `dolly-zoom` | The room rushes forward while you stay the same size |
| `clone-row` | Copies of you step out from behind you, right and left |
| `incoming-call` | A call card drops in, rings and is picked up |
| `day-dial` | A dial of days, or any list, spins behind your head and lands on one |
| `search-suggest` | A search bar types your question and suggestions drop down |
| `live-cursor` | A named cursor drags a selection box around your head |
| `comment-drop` | The comment you are answering drops in above you |
| `code-body` | Your silhouette fills with scrolling code |
| `voice-note` | A voice-note card whose waveform is your real voice |
| `shockwave` | A ring bursts out from you and bends the room |
| `double-exposure` | A picture or video shows inside your silhouette |
| `head-stack` | Copies of your head rise and stack upward |
| `rack-focus` | Focus pulls from the room to you, or back |
| `banknote` | You become the engraved portrait on a banknote |
| `layer-explode` | The shot pulls apart into three labelled layers |
| `impact-frame` | A negative flash, an ink-and-speed-lines frame, then a hard punch-in |
| `press-front` | You become the picture on a newspaper front page |
| `paper-tear` | A strip of the room rips away behind your head, with your words in it |
| `blow-away` | You break into dust and blow off, or gather out of dust |
| `cover-masthead` | Magazine cover: a huge serif word behind your head, an issue line, a barcode sticker and a caption box |
| `backdrop-word` | Your room is replaced by a solid colour, with giant italic words drifting behind you |

```bash
node scripts/effect.mjs list
node scripts/effect.mjs paper-tear --video take.mp4 --from 12 --to 15 --set "word=The *truth*"
```

The drawn effects use the forest look from the "Editing with Claude" video (forest green, cream type, yellow accent). Add `--set look=plum` for the site colours.

You are cut out of the shot on your own computer, so things can sit behind you. Your sound is kept as it is. The first run on a stretch takes about a minute; after that, trying other settings on the same stretch takes seconds. `renders/all-effects-sheet.jpg` shows one frame of each.

## 51 more effects

`vendor/claude-video-effects` holds a second set of 51 effects by Vibha Ramprakash: orbit, spotlight, LED sign, checklists, a tier list, a reject stamp, glass widgets, iMessage pop-ups, graphs, reel carousels, colour grades and more. They track your face and run on Python. They render in the forest look too (`scripts/forest_look.py` in that folder restyles them; `--style original` gives the look they shipped with). `renders/second-set-forest-*.jpg` shows one frame of each. `/shanley-fx` reaches them too; the full list and options are in `vendor/claude-video-effects/SKILL.md`.

## Use it in Claude Code

Start a new chat and type:

```text
/shanley-animate swatch compare, organic cotton vs linen, linen wins
```

Claude asks for anything missing, renders a draft, checks it, and gives you the file.

Type `/shanley-style` to apply the look from the "Editing with Claude" video to an edit, an animation or a page. The exact rules are in `looks/forest-editorial.css`.

## Use it from the terminal

```bash
npm run list
npm run make -- swatch-compare
npm run make -- hangtag-stat --set number=3x --set unit= --set "label=more videos *posted*" --set "source=My own posting log"
```

Files are saved in `renders/` unless you pass `-o`.

## Set up

You need Claude Code, Node.js 22 or newer, and FFmpeg.

```bash
npm install
npm run setup
```

`npm run setup` adds the `/shanley-animate`, `/shanley-fx`, `/clone-row` and `/shanley-style` commands to Claude Code and downloads the browser that renders the video. Run it again if you move this folder.

## What's inside

- `compositions/` holds one HTML file per animation.
- `assets/` holds the shared look (`brand.css`), the fonts and the animation library.
- `scripts/make.mjs` renders an animation; `scripts/effect.mjs` puts an effect on your footage (the effects are listed in `scripts/effects.mjs`); `scripts/setup.mjs` installs the commands.
- `skills/` holds the four Claude Code commands.
- `looks/` holds the video look as a stylesheet.
- `guide/` holds the setup guide page.

## Built with

- [HyperFrames](https://github.com/heygen-com/hyperframes) (Apache-2.0) turns the HTML into video.
- [GSAP](https://gsap.com) (GSAP standard licence) drives the motion.
- [claude-video-effects](https://github.com/Vibha-Ramprakash/claude-video-effects) by Vibha Ramprakash (MIT) is the second set of 51 effects, in `vendor/`. Its licence, font licences and model notices are kept in that folder and must stay with it.
- Bricolage Grotesque, Instrument Serif and Geist Mono (SIL Open Font Licence 1.1; licence texts in `assets/fonts/`).

All animations, sketches and designs in this pack are original to Shanley AI, except the contents of `vendor/`.
