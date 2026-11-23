# Changes made by Shanley AI

This folder is a copy of [claude-video-effects](https://github.com/Vibha-Ramprakash/claude-video-effects) by Vibha Ramprakash, used under the MIT licence in `LICENSE`. That licence and the font and model notices must stay with it.

Changed in November 2026:

- `scripts/forest_look.py` (new): the Shanley forest look. It recolours and re-fonts everything the effects draw, and replaces glass and glow panels with flat blocks.
- `scripts/fx.py`: a `--style` switch (`forest` is the default, `original` gives the look the effects shipped with), and a few room tints that differ between the two styles.
- `fonts/`: Instrument Serif Regular and Geist Mono Medium added (SIL Open Font Licence; texts in this folder).
- `requirements.txt`: fonttools added.
- `scripts/words.py`: the sound is read with ffmpeg before transcribing, which fixes a crash on fresh installs.
- `scripts/fx.py`: `lineup` keeps its end tiles inside the frame; `headline-wall` takes a `handle` option for the name on the cards; `place-in-grid` hides the view counts when `views` is blank.

The 51 effects themselves, their motion and their layouts are the original author's work.
