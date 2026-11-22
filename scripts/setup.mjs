#!/usr/bin/env node
// Checks what the pack needs and adds its /shanley-animate command to Claude Code.
// Safe to run again after you move the folder or update the pack.
//   npm run setup
//   npm run setup -- --skills-dir <folder>   put the command somewhere other than ~/.claude/skills
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

if (Number(process.versions.node.split(".")[0]) < 22) fail(`Node 22 or newer is needed. You have ${process.versions.node}.`);
if (!fs.existsSync(path.join(PACK, "node_modules", "hyperframes"))) fail("Run npm install first.");
for (const tool of ["ffmpeg", "ffprobe"]) {
  if (spawnSync(tool, ["-version"], { stdio: "ignore" }).error) fail(`${tool} is not installed. See the README.`);
}
console.log("Node and FFmpeg: ok");

const flag = process.argv.indexOf("--skills-dir");
const target = path.resolve(flag > -1 ? process.argv[flag + 1] : path.join(os.homedir(), ".claude", "skills"));
const skillsDir = path.join(PACK, "skills");
const installed = [];
for (const name of fs.readdirSync(skillsDir)) {
  const source = path.join(skillsDir, name, "SKILL.md");
  if (!fs.existsSync(source)) continue;
  const body = fs.readFileSync(source, "utf8").replaceAll("{{PACK}}", PACK.replace(/\\/g, "/"));
  fs.mkdirSync(path.join(target, name), { recursive: true });
  fs.writeFileSync(path.join(target, name, "SKILL.md"), body);
  installed.push(`/${name}`);
}
console.log(`Commands added to ${target}: ${installed.join(", ")}`);

console.log("Checking the render browser (the first run downloads it)");
// Run the renderer through Node itself, so the same line works on Mac and Windows.
const cli = path.join(PACK, "node_modules", "hyperframes", "bin", "hyperframes.mjs");
if (spawnSync(process.execPath, [cli, "browser", "ensure"], { stdio: "inherit", cwd: PACK }).status !== 0) fail("Could not set up the render browser.");

console.log("\nReady. Start a new Claude Code chat and type /shanley-animate");
