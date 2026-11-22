#!/usr/bin/env node
// Render one Shanley Animation to a video file.
//
//   node scripts/make.mjs list                          every animation and what you can change in it
//   node scripts/make.mjs swatch-compare                render with the built-in example content
//   node scripts/make.mjs hangtag-stat --set number=87% --set unit= --set "label=of my *weekend* back"
//   node scripts/make.mjs moodboard-pins --vars my-board.json -o ~/Video-Editing/exports/board.mp4
//
// Options:
//   --set key=value     change one piece of content (repeat as needed)
//   --vars file.json    read content from a JSON file ({"title": "...", ...})
//   -o, --output path   where to save (default: renders/<animation>.mp4)
//   --quality q         draft (fast preview), looks (default) or delivery (final)
//   --transparent       save a .mov with a see-through background, to lay over your own footage
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMPS = path.join(PACK, "compositions");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function names() {
  return fs
    .readdirSync(COMPS)
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.replace(/\.html$/, ""))
    .sort();
}

// Each animation declares what can be changed in its <html data-composition-variables='[...]'> attribute.
function variablesOf(name) {
  const html = fs.readFileSync(path.join(COMPS, `${name}.html`), "utf8");
  const match = html.match(/data-composition-variables='([\s\S]*?)'\s*>/);
  return match ? JSON.parse(match[1]) : [];
}

const args = process.argv.slice(2);
const name = args.shift();

if (!name || name === "help" || name === "--help") {
  fail(`Usage: node scripts/make.mjs <animation> [--set key=value] [-o file]\nAnimations: ${names().join(", ")}\nRun "node scripts/make.mjs list" to see what each one lets you change.`);
}

if (name === "list") {
  for (const n of names()) {
    console.log(`\n${n}`);
    for (const v of variablesOf(n)) console.log(`  ${v.id.padEnd(13)} ${v.label}\n  ${" ".repeat(13)} default: ${JSON.stringify(v.default)}`);
  }
  process.exit(0);
}

if (!names().includes(name)) fail(`No animation called "${name}". Choose from: ${names().join(", ")}`);

const declared = variablesOf(name);
const values = {};
let output = null;
let quality = "looks";
let transparent = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--set") {
    const pair = args[++i] ?? "";
    const eq = pair.indexOf("=");
    if (eq < 1) fail(`--set needs key=value, got "${pair}"`);
    values[pair.slice(0, eq)] = pair.slice(eq + 1);
  } else if (a === "--vars") {
    Object.assign(values, JSON.parse(fs.readFileSync(path.resolve(args[++i]), "utf8")));
  } else if (a === "-o" || a === "--output") {
    output = path.resolve(args[++i].replace(/^~(?=\/)/, process.env.HOME ?? "~"));
  } else if (a === "--quality") {
    quality = args[++i];
  } else if (a === "--transparent") {
    transparent = true;
  } else {
    fail(`Unknown option "${a}".`);
  }
}

const known = new Set(declared.map((v) => v.id));
const unknown = Object.keys(values).filter((k) => !known.has(k));
if (unknown.length) fail(`"${name}" has no setting called ${unknown.join(", ")}. It has: ${[...known].join(", ")}`);

const ext = transparent ? "mov" : "mp4";
output ??= path.join(PACK, "renders", `${name}.${ext}`);
fs.mkdirSync(path.dirname(output), { recursive: true });

// Run the renderer through Node itself, so the same line works on Mac and Windows.
const cli = path.join(PACK, "node_modules", "hyperframes", "bin", "hyperframes.mjs");
if (!fs.existsSync(cli)) fail("Run npm install in the shanley-animations folder first.");

const renderArgs = ["render", PACK, "-c", `compositions/${name}.html`, "-q", quality, "-o", output, "--quiet", "--variables", JSON.stringify(values)];
if (transparent) renderArgs.push("--format", "mov");

const res = spawnSync(process.execPath, [cli, ...renderArgs], { stdio: ["ignore", "ignore", "inherit"], cwd: PACK });
if (res.status !== 0 || !fs.existsSync(output)) fail(`The render of "${name}" failed.`);
console.log(output);
