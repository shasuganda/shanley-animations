// The two jobs that work on the picture pixel by pixel, in plain JavaScript:
// painting the room without you, and blowing you away as dust.
import { once } from "node:events";

// Read a raw video stream as whole frames of "size" bytes.
async function* frames(stream, size) {
  let buf = Buffer.alloc(0);
  for await (const chunk of stream) {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    while (buf.length >= size) {
      yield buf.subarray(0, size);
      buf = buf.subarray(size);
    }
  }
}
async function send(stream, data) {
  if (!stream.write(data)) await once(stream, "drain");
}
async function finish(proc, what, fail) {
  let err = "";
  proc.stderr?.on("data", (d) => (err += d));
  const [code] = await once(proc, "close");
  if (code !== 0) fail(`${what} failed.\n${err.split("\n").slice(-12).join("\n")}`);
}

// The room without you. On a small copy of each frame, your shape is filled in from the room around it
// (averaging outward-in, coarse to fine), then the fill is laid back over the full-size frame where you were.
export async function makePlate(ctx, file) {
  console.error("Painting the room without you");
  const W = 135, H = 240;
  const reader = ctx.pipe([
    "-i", ctx.clip, ...ctx.CUT, "-filter_complex",
    `[0:v]scale=${W}:${H}:flags=area,format=rgb24[a];` +
      `[1:v]alphaextract,format=gray,gblur=sigma=16,lut=y='if(gt(val,3),255,0)',scale=${W}:${H}:flags=area,format=rgb24[m];[a][m]hstack[o]`,
    "-map", "[o]", "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
  ], ["ignore", "pipe", "pipe"]);
  const writer = ctx.pipe([
    "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${W}x${H}`, "-r", "30", "-i", "-", "-i", ctx.clip, ...ctx.CUT,
    "-filter_complex",
    // All three in the same plain RGB layout, so the mask applies to every colour channel.
    `[0:v]scale=1080:1920:flags=bicubic,gblur=sigma=6,format=gbrp[fill];` +
      `[2:v]alphaextract,format=gray,gblur=sigma=12,lut=y='clip(val*10,0,255)',format=gbrp[soft];` +
      `[1:v]format=gbrp[base];[base][fill][soft]maskedmerge,format=yuv420p[v]`,
    "-map", "[v]", "-t", String(ctx.length), ...ctx.X264, "-crf", "14", file,
  ], ["pipe", "ignore", "pipe"]);
  const done = Promise.all([finish(reader, "Reading your clip", ctx.fail), finish(writer, "Painting the room", ctx.fail)]);

  // Pyramid levels, each half the size of the one before.
  const levels = [];
  for (let w = W, h = H; ; w = Math.ceil(w / 2), h = Math.ceil(h / 2)) {
    levels.push({ w, h, c: new Float32Array(w * h * 3), k: new Float32Array(w * h) });
    if (w === 1 && h === 1) break;
  }
  const out = Buffer.alloc(W * H * 3);
  let smooth = null;
  for await (const f of frames(reader.stdout, W * 2 * H * 3)) {
    const top = levels[0];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const s = (y * W * 2 + x) * 3;
        const known = f[(y * W * 2 + W + x) * 3] < 128 ? 1 : 0;
        top.k[i] = known;
        top.c[i * 3] = f[s] * known;
        top.c[i * 3 + 1] = f[s + 1] * known;
        top.c[i * 3 + 2] = f[s + 2] * known;
      }
    }
    // Pull: average what is known into each coarser level.
    for (let l = 1; l < levels.length; l++) {
      const a = levels[l - 1], b = levels[l];
      for (let y = 0; y < b.h; y++) {
        for (let x = 0; x < b.w; x++) {
          let r = 0, g = 0, bl = 0, k = 0;
          for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              const xx = Math.min(a.w - 1, x * 2 + dx), yy = Math.min(a.h - 1, y * 2 + dy);
              const j = yy * a.w + xx;
              r += a.c[j * 3]; g += a.c[j * 3 + 1]; bl += a.c[j * 3 + 2]; k += a.k[j];
            }
          }
          const i = y * b.w + x;
          if (k > 0) { b.c[i * 3] = r / k; b.c[i * 3 + 1] = g / k; b.c[i * 3 + 2] = bl / k; b.k[i] = 1; }
          else { b.c[i * 3] = b.c[i * 3 + 1] = b.c[i * 3 + 2] = 0; b.k[i] = 0; }
        }
      }
    }
    // Push: where a finer level has nothing, take the coarser one, read smoothly.
    for (let l = levels.length - 2; l >= 0; l--) {
      const a = levels[l], b = levels[l + 1];
      for (let y = 0; y < a.h; y++) {
        for (let x = 0; x < a.w; x++) {
          const i = y * a.w + x;
          if (a.k[i]) continue;
          const fx = Math.max(0, Math.min(b.w - 1, (x + 0.5) / 2 - 0.5)), fy = Math.max(0, Math.min(b.h - 1, (y + 0.5) / 2 - 0.5));
          const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(b.w - 1, x0 + 1), y1 = Math.min(b.h - 1, y0 + 1);
          const tx = fx - x0, ty = fy - y0;
          for (let ch = 0; ch < 3; ch++) {
            const p = (xx, yy) => b.c[(yy * b.w + xx) * 3 + ch];
            a.c[i * 3 + ch] = (p(x0, y0) * (1 - tx) + p(x1, y0) * tx) * (1 - ty) + (p(x0, y1) * (1 - tx) + p(x1, y1) * tx) * ty;
          }
        }
      }
    }
    // Steady the fill from frame to frame so it does not shimmer.
    if (!smooth) smooth = Float32Array.from(top.c);
    else for (let i = 0; i < smooth.length; i++) smooth[i] = smooth[i] * 0.8 + top.c[i] * 0.2;
    for (let i = 0; i < out.length; i++) out[i] = smooth[i];
    await send(writer.stdin, out);
  }
  writer.stdin.end();
  await done;
}

// Blow away: you break into grains that drift off on the wind, leaving the empty room.
export async function blowAway(ctx, { plate, at, wind, spread, life, grain, lift, mode }) {
  const W = 1080, H = 1920, size = W * H * 4;
  const b = ctx.box();
  console.error(mode === "in" ? "Gathering you out of dust" : "Blowing you away");
  const reader = ctx.pipe([...ctx.CUT, "-f", "rawvideo", "-pix_fmt", "rgba", "-"], ["ignore", "pipe", "pipe"]);
  const shown = mode === "in" ? `lte(t,${(ctx.length - at).toFixed(3)})` : `gte(t,${at})`;
  const writer = ctx.pipe([
    "-i", ctx.clip, ...plate, "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", "30", "-i", "-",
    "-filter_complex", `[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30[room];[room][2:v]overlay=0:0:shortest=1[x];[0:v][x]overlay=0:0:enable='${shown}',format=yuv420p[v]`,
    "-map", "[v]", "-map", "0:a?", "-t", String(ctx.length), ...ctx.X264, "-c:a", "copy", "-movflags", "+faststart", ctx.output,
  ], ["pipe", "ignore", "pipe"]);
  const done = Promise.all([finish(reader, "Reading the cut-out", ctx.fail), finish(writer, "Blowing you away", ctx.fail)]);

  // Each grain gets fixed random numbers from its place in the grid, so every render comes out the same.
  const gw = Math.ceil(W / grain), gh = Math.ceil(H / grain);
  const rnd = (x, y, n) => {
    const v = Math.sin(x * 12.9898 + y * 78.233 + n * 37.719) * 43758.5453;
    return v - Math.floor(v);
  };
  const h0 = new Float32Array(gw * gh), h1 = new Float32Array(gw * gh), h2 = new Float32Array(gw * gh), h3 = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const i = y * gw + x;
    h0[i] = rnd(x, y, 0); h1[i] = rnd(x, y, 1); h2[i] = rnd(x, y, 2); h3[i] = rnd(x, y, 3);
  }
  const dir = wind >= 0 ? 1 : -1;
  const span = Math.max(1, b.x2 - b.x1);
  const out = Buffer.alloc(size);
  const o32 = new Uint32Array(out.buffer, out.byteOffset, W * H);
  let n = 0;
  for await (const f of frames(reader.stdout, size)) {
    const raw = n++ / 30;
    const t = mode === "in" ? ctx.length - raw : raw;
    const copy = Buffer.from(f); // aligned copy, so it can be read as whole pixels
    const s32 = new Uint32Array(copy.buffer, copy.byteOffset, W * H);
    o32.fill(0);
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        const x = gx * grain, y = gy * grain;
        const mid = Math.min(H - 1, y + (grain >> 1)) * W + Math.min(W - 1, x + (grain >> 1));
        const a = copy[mid * 4 + 3];
        if (a < 12) continue;
        const i = gy * gw + gx;
        // The downwind side goes first, and the wave travels back through you.
        const u = Math.max(0, Math.min(1, (x - b.x1) / span));
        const release = at + spread * (0.7 * (dir > 0 ? 1 - u : u) + 0.3 * h0[i]);
        if (t < release) {
          for (let yy = y; yy < Math.min(H, y + grain); yy++) {
            const row = yy * W;
            for (let xx = x; xx < Math.min(W, x + grain); xx++) o32[row + xx] = s32[row + xx];
          }
          continue;
        }
        const age = t - release;
        const lasts = life * (0.45 + 0.75 * h1[i]);
        if (age >= lasts) continue;
        const k = age / lasts;
        const px = Math.round(x + wind * age * (0.25 + 0.9 * h2[i]) + wind * 0.9 * age * age);
        const py = Math.round(y - lift * (0.2 + h3[i]) * age + 26 * Math.sin(age * 7 + h1[i] * 6.283));
        const sz = Math.max(1, Math.round(grain * (1 - 0.65 * k)));
        const alpha = Math.round(a * Math.pow(1 - k, 1.3));
        if (alpha < 6) continue;
        const colour = (s32[mid] & 0x00ffffff) | (alpha << 24);
        for (let yy = Math.max(0, py); yy < Math.min(H, py + sz); yy++) {
          const row = yy * W;
          for (let xx = Math.max(0, px); xx < Math.min(W, px + sz); xx++) o32[row + xx] = colour >>> 0;
        }
      }
    }
    await send(writer.stdin, out);
  }
  writer.stdin.end();
  await done;
}
