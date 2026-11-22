#!/usr/bin/env node
// Put an editorial effect on a stretch of your own talking-head video.
// The speaker is cut out, so type can sit BEHIND their head, and the original sound is kept.
//
//   node scripts/effect.mjs cover-masthead --video take.mp4 --from 12 --to 16 --set masthead=SHANLEY
//   node scripts/effect.mjs backdrop-word  --video take.mp4 --from 31.5 --to 34 --set "phrase=Claude *did.*"
//
// Options:
//   --video path        the talking-head video (any shape; it is fitted to 1080x1920)
//   --from s --to s     the stretch to treat, in seconds (default: the first 4 seconds)
//   --set key=value     change one setting of the effect (repeat as needed; see "make.mjs list")
//   -o, --output path   where to save (default: renders/<effect>-<from>s.mp4)
//   --keep              keep the working files (the cut-out and the layers) and print their folder
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EFFECTS = ["cover-masthead", "backdrop-word"];
const INTRO = 4; // seconds each effect animates for; after that its last frame holds

function fail(message) {
  console.error(message);
  process.exit(1);
}
const home = (p) => path.resolve(p.replace(/^~(?=\/)/, process.env.HOME ?? "~"));

const args = process.argv.slice(2);
const effect = args.shift();
if (!EFFECTS.includes(effect)) fail(`Usage: node scripts/effect.mjs <effect> --video file --from s --to s\nEffects: ${EFFECTS.join(", ")}`);

const values = {};
let video = null;
let from = 0;
let to = null;
let output = null;
let keep = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--video") video = home(args[++i]);
  else if (a === "--from") from = Number(args[++i]);
  else if (a === "--to") to = Number(args[++i]);
  else if (a === "-o" || a === "--output") output = home(args[++i]);
  else if (a === "--keep") keep = true;
  else if (a === "--set") {
    const pair = args[++i] ?? "";
    const eq = pair.indexOf("=");
    if (eq < 1) fail(`--set needs key=value, got "${pair}"`);
    values[pair.slice(0, eq)] = pair.slice(eq + 1);
  } else fail(`Unknown option "${a}".`);
}
if (!video || !fs.existsSync(video)) fail("Pass --video with the path to your talking-head video.");
to ??= from + INTRO;
const length = to - from;
if (!(length > 0.3)) fail("--to must be later than --from.");
if (length > 20) fail("Keep an effect under 20 seconds: the cut-out takes about a minute per few seconds of video.");
if ("layer" in values) fail('"layer" is set by this script. Leave it out.');

// Run the renderer through Node itself, so the same line works on Mac and Windows.
const cli = path.join(PACK, "node_modules", "hyperframes", "bin", "hyperframes.mjs");
if (!fs.existsSync(cli)) fail("Run npm install in the shanley-animations folder first.");

output ??= path.join(PACK, "renders", `${effect}-${String(from).replace(".", "_")}s.mp4`);
fs.mkdirSync(path.dirname(output), { recursive: true });
const work = fs.mkdtempSync(path.join(os.tmpdir(), "shanley-fx-"));

function run(what, cmd, cmdArgs) {
  console.error(what);
  const res = spawnSync(cmd, cmdArgs, { stdio: ["ignore", "ignore", "pipe"], cwd: PACK, encoding: "utf8" });
  if (res.error || res.status !== 0) fail(`${what} failed.\n${(res.stderr ?? "").split("\n").slice(-12).join("\n")}`);
}

// 1. Cut the stretch and fit it to a 1080x1920 frame at 30 fps.
const clip = path.join(work, "clip.mp4");
run("Cutting your clip", "ffmpeg", [
  "-v", "error", "-y", "-ss", String(from), "-t", String(length), "-i", video,
  "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p",
  "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-c:a", "aac", "-b:a", "192k", clip,
]);

// 2. Cut the speaker out of it, on this computer.
const cutout = path.join(work, "cutout.webm");
run("Cutting you out of the shot (about a minute)", process.execPath, [cli, "remove-background", clip, "-o", cutout, "--quality", "best"]);

// 3. Draw the two type layers with see-through backgrounds.
const layers = {};
for (const layer of ["behind", "front"]) {
  layers[layer] = path.join(work, `${layer}.mov`);
  run(`Drawing the ${layer === "behind" ? "type behind you" : "type in front of you"}`, process.execPath, [cli,
    "render", PACK, "-c", `compositions/${effect}.html`, "--format", "mov", "-o", layers[layer], "--quiet",
    "--variables", JSON.stringify({ ...values, layer }),
  ]);
}

// 4. Stack them: your clip, the type behind, you, the type in front. Your sound is untouched.
const hold = Math.max(0, length - INTRO + 0.5).toFixed(2);
run("Putting the layers together", "ffmpeg", [
  "-v", "error", "-y",
  "-i", clip,
  "-i", layers.behind,
  "-c:v", "libvpx-vp9", "-i", cutout,
  "-i", layers.front,
  "-filter_complex",
  `[1:v]tpad=stop_mode=clone:stop_duration=${hold}[b];[3:v]tpad=stop_mode=clone:stop_duration=${hold}[f];` +
    `[0:v][b]overlay=0:0[x];[x][2:v]overlay=0:0[y];[y][f]overlay=0:0,format=yuv420p[v]`,
  "-map", "[v]", "-map", "0:a?", "-t", String(length),
  "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-c:a", "copy", "-movflags", "+faststart", output,
]);

if (keep) console.error(`Working files kept in ${work}`);
else fs.rmSync(work, { recursive: true, force: true });
console.log(output);
