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

| Name | What it does |
|---|---|
| `cover-masthead` | Magazine cover: a huge serif word behind your head, an issue line, a barcode sticker and a caption box |
| `backdrop-word` | Your room is replaced by a solid colour, with giant italic words drifting behind you |

```bash
node scripts/effect.mjs cover-masthead --video take.mp4 --from 12 --to 16 --set masthead=SHANLEY
```

Both use the forest look from the "Editing with Claude" video by default (forest green, cream type, yellow accent). Add `--set look=plum` for the site colours, and `--set "overline=Editing with"` for a small italic line on top of the big word.

You are cut out of the shot on your own computer, so the type can sit behind your head. Your sound is kept as it is. Each run takes about a minute.

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

`npm run setup` adds the `/shanley-animate` and `/shanley-style` commands to Claude Code and downloads the browser that renders the video. Run it again if you move this folder.

## What's inside

- `compositions/` holds one HTML file per animation.
- `assets/` holds the shared look (`brand.css`), the fonts and the animation library.
- `scripts/make.mjs` renders an animation; `scripts/setup.mjs` installs the command.
- `skills/` holds the two Claude Code commands.
- `looks/` holds the video look as a stylesheet.
- `guide/` holds the setup guide page.

## Built with

- [HyperFrames](https://github.com/heygen-com/hyperframes) (Apache-2.0) turns the HTML into video.
- [GSAP](https://gsap.com) (GSAP standard licence) drives the motion.
- Bricolage Grotesque, Instrument Serif and Geist Mono (SIL Open Font Licence 1.1; licence texts in `assets/fonts/`).

All animations, sketches and designs in this pack are original to Shanley AI.
