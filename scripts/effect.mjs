#!/usr/bin/env node
// Put an effect on a stretch of your own talking-head video.
// You are cut out of the shot on this computer, so things can sit BEHIND you, and the original sound is kept.
//
//   node scripts/effect.mjs list
//   node scripts/effect.mjs cover-masthead --video take.mp4 --from 12 --to 16 --set masthead=SHANLEY
//   node scripts/effect.mjs clone-row      --video take.mp4 --from 8 --to 11 --set clones=4
//
// Options:
//   --video path        the talking-head video (any shape; it is fitted to 1080x1920)
//   --from s --to s     the stretch to treat, in seconds (default: the first 4 seconds)
//   --set key=value     change one setting of the effect (repeat as needed; "list" shows them all)
//   -o, --output path   where to save (default: renders/<effect>-<from>s.mp4)
//   --keep              keep the working files and print their folder
//   --fresh             cut you out again, even if this stretch was cut out before
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EFFECTS } from "./effects.mjs";
import { makePlate } from "./pixels.mjs";

const PACK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INTRO = 4; // seconds a drawn layer animates for; after that its last frame holds

function fail(message) {
  console.error(message);
  process.exit(1);
}
const home = (p) => path.resolve(p.replace(/^~(?=\/)/, process.env.HOME ?? "~"));

// Settings a drawn layer takes are declared in its composition file.
function compositionSettings(name) {
  const file = path.join(PACK, "compositions", `${name}.html`);
  if (!fs.existsSync(file)) return [];
  const m = fs.readFileSync(file, "utf8").match(/data-composition-variables='([\s\S]*?)'/);
  return m ? JSON.parse(m[1]) : [];
}
const AUTO = new Set(["layer", "headTop", "centreX", "bars", "seconds", "text"]); // filled in by this script

function settingsOf(name) {
  const fx = EFFECTS[name];
  const own = Object.entries(fx.settings ?? {}).map(([id, [def, label]]) => ({ id, default: def, label }));
  const drawn = fx.composition ? compositionSettings(fx.composition).filter((s) => !AUTO.has(s.id)) : [];
  const start = fx.run ? [] : [{ id: "at", default: 0, label: "Seconds into the stretch when it starts" }];
  return [...own, ...start, ...drawn.filter((d) => !own.some((o) => o.id === d.id))];
}

const args = process.argv.slice(2);
const effect = args.shift();
if (effect === "list") {
  for (const [name, fx] of Object.entries(EFFECTS)) {
    console.log(`\n${name}: ${fx.about}`);
    for (const s of settingsOf(name)) console.log(`    ${s.id.padEnd(12)} ${s.label}  [${s.default === "" ? "empty" : s.default}]`);
  }
  process.exit(0);
}
if (!(effect in EFFECTS)) {
  fail(`Usage: node scripts/effect.mjs <effect> --video file --from s --to s\n       node scripts/effect.mjs list\nEffects: ${Object.keys(EFFECTS).join(", ")}`);
}
const fx = EFFECTS[effect];

const values = {};
let video = null;
let from = 0;
let to = null;
let output = null;
let keep = false;
let fresh = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--video") video = home(args[++i]);
  else if (a === "--from") from = Number(args[++i]);
  else if (a === "--to") to = Number(args[++i]);
  else if (a === "-o" || a === "--output") output = home(args[++i]);
  else if (a === "--keep") keep = true;
  else if (a === "--fresh") fresh = true;
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
const known = settingsOf(effect).map((s) => s.id);
for (const key of Object.keys(values)) {
  if (AUTO.has(key)) fail(`"${key}" is set by this script. Leave it out.`);
  if (!known.includes(key)) fail(`${effect} has no setting "${key}". It takes: ${known.join(", ")}.`);
}

// Run the renderer through Node itself, so the same line works on Mac and Windows.
const cli = path.join(PACK, "node_modules", "hyperframes", "bin", "hyperframes.mjs");
if (!fs.existsSync(cli)) fail("Run npm install in the shanley-animations folder first.");

output ??= path.join(PACK, "renders", `${effect}-${String(from).replace(".", "_")}s.mp4`);
fs.mkdirSync(path.dirname(output), { recursive: true });
const work = fs.mkdtempSync(path.join(os.tmpdir(), "shanley-fx-"));

function run(what, cmd, cmdArgs) {
  if (what) console.error(what);
  const res = spawnSync(cmd, cmdArgs, { stdio: ["ignore", "ignore", "pipe"], cwd: PACK, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (res.error || res.status !== 0) fail(`${what || cmd} failed.\n${(res.stderr ?? "").split("\n").slice(-12).join("\n")}`);
  return res.stderr ?? "";
}

// 1 and 2. Cut the stretch, fit it to 1080x1920 at 30 fps, and cut you out of it.
// Both are kept beside the renders, so trying other settings on the same stretch is quick.
const stat = fs.statSync(video);
const key = crypto.createHash("sha1").update(`${video}|${stat.size}|${stat.mtimeMs}|${from}|${to}`).digest("hex").slice(0, 16);
const cache = path.join(PACK, "renders", ".cutouts", key);
fs.mkdirSync(cache, { recursive: true });
const clip = path.join(cache, "clip.mp4");
const cutout = path.join(cache, "cutout.webm");
if (fresh || !fs.existsSync(clip) || !fs.existsSync(cutout)) {
  run("Cutting your clip", "ffmpeg", [
    "-v", "error", "-y", "-ss", String(from), "-t", String(length), "-i", video,
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p",
    "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-c:a", "aac", "-b:a", "192k", clip,
  ]);
  const tmp = path.join(work, "cutout.webm");
  run("Cutting you out of the shot (about a minute)", process.execPath, [cli, "remove-background", clip, "-o", tmp, "--quality", "best"]);
  fs.copyFileSync(tmp, cutout);
}

const X264 = ["-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p"];
const ctx = {
  PACK, work, clip, cutout, length, output, values, run, fail,
  CUT: ["-c:v", "libvpx-vp9", "-i", cutout], // the cut-out must be read with this decoder to keep its see-through part

  // A number setting, checked against its range.
  num(key, min, max) {
    const def = fx.settings[key][0];
    const n = values[key] === undefined || values[key] === "" ? Number(def) : Number(values[key]);
    if (!Number.isFinite(n) || n < min || n > max) fail(`${effect}: "${key}" must be a number from ${min} to ${max}.`);
    return n;
  },
  str(key) {
    return values[key] ?? String(fx.settings[key][0]);
  },

  // Where you are in the frame, read from the cut-out about a third of the way in.
  box(rows) {
    const crop = rows ? `crop=1080:${Math.round(rows[1])}:0:${Math.round(rows[0])},` : "";
    const probe = run(rows ? "" : "Finding where you are in the frame", "ffmpeg", [
      "-v", "info", "-y", "-c:v", "libvpx-vp9", "-ss", (length / 3).toFixed(2), "-i", cutout,
      "-vf", `alphaextract,${crop}bbox=min_val=128`, "-frames:v", "1", "-f", "null", "-",
    ]);
    const m = probe.match(/x1:(\d+) x2:(\d+) y1:(\d+) y2:(\d+)/);
    if (!m) fail(`${effect} could not find a person in that stretch. Try a stretch where you are in the shot.`);
    const [x1, x2, y1, y2] = m.slice(1).map(Number);
    const headTop = values.headY ? (Number(values.headY) / 100) * 1920 : y1 + (rows ? rows[0] : 0);
    return { x1, x2, y1, y2, centreX: (x1 + x2) / 2, headTop };
  },

  // The room without you (see pixels.mjs). Kept beside the cut-out, so it is made once per stretch.
  async plate() {
    const file = path.join(cache, "plate.mp4");
    if (!fs.existsSync(file) || fresh) await makePlate(ctx, file);
    return file;
  },

  // A single still image made by a filter, for masks and patterns.
  still(name, source) {
    const file = path.join(work, `${name}.png`);
    run("", "ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", source, "-frames:v", "1", file]);
    return file;
  },

  // Draw one layer of a composition with a see-through background.
  layer(composition, layer, vars = {}, format = "mov") {
    const file = path.join(work, `${composition}-${layer}.${format}`);
    run(`Drawing the ${layer === "behind" ? "part behind you" : layer === "front" ? "part in front of you" : "graphics"}`, process.execPath, [cli,
      "render", PACK, "-c", `compositions/${composition}.html`, "--format", format, "-o", file, "--quiet",
      "--variables", JSON.stringify({ ...vars, layer }),
    ]);
    return file;
  },

  // Put layers together into the finished clip. Input 0 is always your clip; your sound is untouched.
  compose(what, inputs, graph) {
    run(what, "ffmpeg", [
      "-v", "error", "-y", "-i", clip, ...inputs,
      "-filter_complex", graph,
      "-map", "[v]", "-map", "0:a?", "-t", String(length),
      ...X264, "-c:a", "copy", "-movflags", "+faststart", output,
    ]);
  },

  // Start a long-running ffmpeg with pipes, for effects that work on the picture frame by frame.
  pipe(ffArgs, stdio) {
    return spawn("ffmpeg", ["-v", "error", "-y", ...ffArgs], { stdio, cwd: PACK });
  },
  X264,
};

// ffmpeg expressions: ease(start, seconds) goes 0 to 1 quickly and settles, like power3.out.
ctx.ease = (start, dur = 0.3) => `(1-pow(1-clip((t-${Number(start).toFixed(3)})/${dur},0,1),3))`;
// ...and leave(start) goes 1 to 0, for stepping back out before the end.
ctx.leave = (start, dur = 0.3) => `(1-pow(clip((t-${Number(start).toFixed(3)})/${dur},0,1),3))`;

if (fx.run) {
  await fx.run(ctx);
} else {
  // A drawn effect: the type behind you, you, the type in front of you.
  const at = Math.max(0, Math.min(length - 0.2, Number(values.at ?? 0) || 0));
  const vars = { ...values };
  delete vars.at;
  if (fx.needsBox) {
    const b = ctx.box();
    vars.headTop = String(Math.round(b.headTop));
    vars.centreX = String(Math.round(b.centreX));
  }
  if (fx.prepare) Object.assign(vars, await fx.prepare(ctx, at));
  const layers = fx.layers ?? ["behind", "front"];
  const files = Object.fromEntries(layers.map((l) => [l, ctx.layer(fx.composition, l, vars)]));
  const hold = Math.max(0, length - at - INTRO + 0.5).toFixed(2);
  const on = `enable='gte(t,${at.toFixed(3)})'`;
  const shift = `setpts=PTS+${at.toFixed(3)}/TB,tpad=stop_mode=clone:stop_duration=${hold}`;
  const inputs = [];
  let graph = "";
  let last = "[0:v]";
  let n = 1;
  if (files.behind) {
    inputs.push("-i", files.behind);
    graph += `[${n}:v]${shift}[b];${last}[b]overlay=0:0:${on}[x];`;
    last = "[x]";
    n++;
  }
  inputs.push(...ctx.CUT);
  graph += `${last}[${n}:v]overlay=0:0[y];`;
  last = "[y]";
  n++;
  if (files.front) {
    inputs.push("-i", files.front);
    graph += `[${n}:v]${shift}[f];${last}[f]overlay=0:0:${on}[z];`;
    last = "[z]";
  }
  graph += `${last}format=yuv420p[v]`;
  ctx.compose("Putting the layers together", inputs, graph);
}

if (keep) console.error(`Working files kept in ${work}`);
else fs.rmSync(work, { recursive: true, force: true });
console.log(output);
