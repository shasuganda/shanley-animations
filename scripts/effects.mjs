// Every effect that scripts/effect.mjs can put on your footage.
//
// A drawn effect has a "composition" (an HTML file in compositions/) and is stacked as:
// your clip, the part behind you, you, the part in front of you.
// A footage effect has "settings" and a "run" that works on the picture itself with ffmpeg.
// settings: { name: [default, "what it changes"] }

import fs from "node:fs";
import { blowAway } from "./pixels.mjs";

const FOREST = "#203028";
const hex = (c) => String(c).trim().replace(/^#/, "0x");
const isColour = (c) => /^#?[0-9a-f]{6}$/i.test(String(c).trim());

// Something to show behind a reveal: a colour, a picture or a video, as ffmpeg input options.
function source(ctx, value) {
  if (isColour(value)) return ["-f", "lavfi", "-i", `color=c=${hex(value)}:s=1080x1920:r=30`];
  const file = value.replace(/^~(?=\/)/, process.env.HOME ?? "~");
  if (!fs.existsSync(file)) ctx.fail(`Could not find "${value}". Pass a colour like #203028, or the path to a picture or video.`);
  return /\.(png|jpe?g|webp|heic|tiff?)$/i.test(file) ? ["-loop", "1", "-framerate", "30", "-i", file] : ["-stream_loop", "-1", "-i", file];
}
const COVER = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30";

export const EFFECTS = {
  "cover-masthead": {
    about: "Magazine cover: a huge serif word behind your head, an issue line, a barcode sticker and a caption box",
    composition: "cover-masthead",
  },
  "backdrop-word": {
    about: "Your room is replaced by a solid colour, with giant italic words drifting behind you",
    composition: "backdrop-word",
  },

  "clone-row": {
    about: "Copies of you step out from behind you, right and left, and move in step with you",
    settings: {
      clones: [4, "How many copies (1 to 8); they alternate right, left, right, left"],
      scale: [62, "Size of the nearest copies, as a percent of you"],
      falloff: [86, "Each pair further out is this percent of the pair before it"],
      spread: [250, "How far apart the copies stand, in pixels"],
      at: [0.3, "Seconds into the stretch when the first copy steps out"],
      stagger: [0.12, "Seconds between one copy and the next"],
      out: [0, "Seconds before the end when the copies step back in (0: they stay until the cut)"],
      drop: [30, "How far the copies' heads sit below yours, in pixels"],
      dim: [0, "Darken the copies by this percent per pair, for depth"],
      headY: ["", "Top of your head as a percent from the top (empty: found from the cut-out)"],
    },
    run(ctx) {
      const { length } = ctx;
      const count = Math.round(ctx.num("clones", 1, 8));
      const scale = ctx.num("scale", 20, 95) / 100;
      const falloff = ctx.num("falloff", 50, 100) / 100;
      const spread = ctx.num("spread", 40, 600);
      const at = ctx.num("at", 0, length);
      const stagger = ctx.num("stagger", 0, 2);
      const out = ctx.num("out", 0, length);
      const drop = ctx.num("drop", -300, 300);
      const dim = ctx.num("dim", 0, 40) / 100;
      const { centreX, headTop } = ctx.box();

      // Furthest pair first, so nearer copies cover further ones; you go on top of them all.
      const parts = [`[1:v]split=${count + 1}${Array.from({ length: count + 1 }, (_, i) => `[s${i}]`).join("")}`];
      let last = "[0:v]";
      for (let i = count - 1; i >= 0; i--) {
        const pair = Math.floor(i / 2) + 1;
        const side = i % 2 === 0 ? 1 : -1;
        const size = scale * falloff ** (pair - 1);
        const shade = ((1 - dim) ** pair).toFixed(3);
        const start = at + i * stagger;
        // Scaling keeps the top of the head where it was, then the copy drops and steps sideways.
        const homeX = centreX - size * centreX;
        const y = Math.round(headTop - size * headTop + drop);
        const travel = side * spread * pair;
        let ease = ctx.ease(start, 0.28);
        if (out > 0) ease += `*${ctx.leave(length - out, 0.28)}`;
        // The copy's lower edge fades out, so no hard line shows where its body stops.
        const w = Math.round((1080 * size) / 2) * 2;
        const h = Math.round((1920 * size) / 2) * 2;
        parts.push(
          `[s${i}]scale=${w}:${h},format=rgba` + (dim > 0 ? `,colorchannelmixer=rr=${shade}:gg=${shade}:bb=${shade}` : "") + `,split[p${i}][q${i}]`,
          `[q${i}]alphaextract[a${i}]`,
          `gradients=s=${w}x${h}:r=30:c0=white:c1=black:nb_colors=2:x0=0:y0=${Math.round(h * 0.72)}:x1=0:y1=${h - 4}:speed=0,format=gray[g${i}]`,
          `[a${i}][g${i}]blend=all_mode=multiply:shortest=1[m${i}]`,
          `[p${i}][m${i}]alphamerge[c${i}]`,
          `${last}[c${i}]overlay=x='${homeX.toFixed(1)}+${travel.toFixed(1)}*${ease}':y=${y}:enable='gte(t,${start.toFixed(3)})'[o${i}]`,
        );
        last = `[o${i}]`;
      }
      parts.push(`${last}[s${count}]overlay=0:0,format=yuv420p[v]`);
      ctx.compose("Lining up the copies", ctx.CUT, parts.join(";"));
    },
  },

  "room-doors": {
    about: "The room behind you splits down the middle and opens like two doors, showing a colour, picture or video; you stay put",
    settings: {
      reveal: [FOREST, "What is behind the doors: a colour, or the path to a picture or video"],
      at: [0.3, "Seconds into the stretch when the doors start to open"],
      open: [80, "How far the doors open, as a percent (100: all the way off screen)"],
      speed: [0.6, "Seconds the doors take to open"],
      out: [0, "Seconds before the end when the doors close again (0: they stay open until the cut)"],
    },
    async run(ctx) {
      const at = ctx.num("at", 0, ctx.length);
      const open = ctx.num("open", 10, 100) / 100;
      const speed = ctx.num("speed", 0.1, 5);
      const out = ctx.num("out", 0, ctx.length);
      let e = ctx.ease(at, speed);
      if (out > 0) e += `*${ctx.leave(ctx.length - out, Math.min(speed, out))}`;
      const edge = "color=black@0.5:t=fill";
      ctx.compose("Opening the doors", ["-i", await ctx.plate(), ...ctx.CUT, ...source(ctx, ctx.str("reveal"))],
        `[3:v]${COVER},format=yuv420p[g];[1:v]split[pl][pr];` +
          `[pl]crop=540:1920:0:0,drawbox=x=530:y=0:w=10:h=1920:${edge}[l];` +
          `[pr]crop=540:1920:540:0,drawbox=x=0:y=0:w=10:h=1920:${edge}[r];` +
          `[g][l]overlay=x='-540*${open}*${e}':y=0[a];[a][r]overlay=x='540+540*${open}*${e}':y=0[b];` +
          `[0:v][b]overlay=0:0:enable='gte(t,${at})'[c];[c][2:v]overlay=0:0,format=yuv420p[v]`);
    },
  },

  "blade-slice": {
    about: "A blade flashes across the frame and the two halves of the shot slip apart along the cut",
    settings: {
      at: [0.3, "Seconds into the stretch when the cut lands"],
      angle: [-16, "Tilt of the cut in degrees (negative rises to the right)"],
      cutY: [50, "Where the cut crosses the middle of the frame, as a percent from the top"],
      shift: [80, "How far each half slips along the cut, in pixels"],
      gap: [10, "How far the halves pull apart, in pixels"],
      hold: [0.7, "Seconds the halves stay apart before snapping back (0: until the end)"],
      colour: ["#14201a", "Colour showing in the gap"],
    },
    run(ctx) {
      const at = ctx.num("at", 0, ctx.length);
      const a = (ctx.num("angle", -60, 60) * Math.PI) / 180;
      const cy = (ctx.num("cutY", 5, 95) / 100) * 1920;
      const shift = ctx.num("shift", 0, 400);
      const gap = ctx.num("gap", 0, 200);
      const hold = ctx.num("hold", 0, ctx.length);
      // Distance of a pixel below the cut line, in pixels.
      const dist = `(((Y-${cy})-(X-540)*${Math.tan(a).toFixed(5)})*${Math.cos(a).toFixed(5)})`;
      const mask = ctx.still("slice-mask", `color=c=black:s=1080x1920,format=gray,geq=lum='255*gt(${dist},0)'`);
      const line = ctx.still("slice-line", `color=c=white:s=1080x1920,format=rgba,geq=r=255:g=255:b=245:a='255*lt(abs(${dist}),4)'`);
      let e = ctx.ease(at, 0.12);
      if (hold > 0) e += `*${ctx.leave(at + hold, 0.12)}`;
      const dx = (shift * Math.cos(a) + gap * Math.sin(a)).toFixed(2);
      const dy = (shift * Math.sin(a) - gap * Math.cos(a)).toFixed(2);
      ctx.compose("Slicing the shot", ["-loop", "1", "-framerate", "30", "-i", mask, "-loop", "1", "-framerate", "30", "-i", line, ...source(ctx, ctx.str("colour"))],
        `[0:v]split[fa][fb];[1:v]format=gray,split[m1][m2];[m2]negate[mi];[fa][m1]alphamerge[bot];[fb][mi]alphamerge[top];` +
          `[3:v]format=yuv420p[g];[g][top]overlay=x='${dx}*${e}':y='${dy}*${e}'[x];[x][bot]overlay=x='-(${dx})*${e}':y='-(${dy})*${e}'[y];` +
          `[y][2:v]overlay=0:0:enable='between(t,${(at - 0.034).toFixed(3)},${(at + 0.07).toFixed(3)})',format=yuv420p[v]`);
    },
  },

  "dolly-zoom": {
    about: "The room rushes toward the camera while you stay exactly the same size (the film 'vertigo' shot)",
    settings: {
      at: [0, "Seconds into the stretch when the room starts to move"],
      over: [0, "Seconds the move takes (0: the rest of the stretch)"],
      amount: [35, "How much the room grows, as a percent"],
    },
    async run(ctx) {
      const at = ctx.num("at", 0, ctx.length);
      const over = ctx.num("over", 0, ctx.length) || ctx.length - at;
      const amount = ctx.num("amount", 2, 150) / 100;
      const b = ctx.box();
      const p = `clip((on/30-${at})/${over.toFixed(3)},0,1)`;
      const z = `(1+${amount}*${p}*${p}*(3-2*${p}))`;
      // Drawn at twice the size so the slow move is smooth, zooming about your face.
      ctx.compose("Moving the room", ["-i", await ctx.plate(), ...ctx.CUT],
        `[1:v]scale=2160:3840:flags=bicubic,zoompan=z='${z}':x='${(b.centreX * 2).toFixed(0)}*(1-1/zoom)':y='${((b.headTop + 160) * 2).toFixed(0)}*(1-1/zoom)':d=1:s=1080x1920:fps=30[bg];` +
          `[bg][2:v]overlay=0:0:shortest=1,format=yuv420p[v]`);
    },
  },

  "rack-focus": {
    about: "The focus pulls from the room to you (or from you to the room), like a lens being turned",
    settings: {
      to: ["me", "Where the focus ends up: me or room"],
      at: [0.3, "Seconds into the stretch when the focus starts to move"],
      over: [0.5, "Seconds the pull takes"],
      blur: [16, "How soft the out-of-focus part gets"],
    },
    async run(ctx) {
      const to = ctx.str("to");
      if (!["me", "room"].includes(to)) ctx.fail('rack-focus: "to" must be me or room.');
      const at = ctx.num("at", 0, ctx.length);
      const over = ctx.num("over", 0.05, ctx.length);
      const blur = ctx.num("blur", 2, 60);
      const k = `clip((T-${at})/${over},0,1)`;
      const [first, second] = to === "me" ? ["roomsharp", "mesharp"] : ["mesharp", "roomsharp"];
      ctx.compose("Pulling focus", ["-i", await ctx.plate(), ...ctx.CUT],
        `[1:v]split[p1][p2];[p2]gblur=sigma=${blur}[pb];[2:v]split=3[c1][c2][c3];` +
          `[c2]premultiply=inplace=1,gblur=sigma=${(blur * 0.6).toFixed(1)},unpremultiply=inplace=1[cb];` +
          `[p1][cb]overlay=0:0,format=yuv420p[roomsharp];[pb][c1]overlay=0:0,format=yuv420p[mesharp];` +
          `[${first}][${second}]blend=all_expr='A+(B-A)*${k}*${k}*(3-2*${k})',format=yuv420p[v];[c3]nullsink`);
    },
  },

  "shockwave": {
    about: "A ring bursts out from you and bends the room as it passes",
    settings: {
      at: [0.3, "Seconds into the stretch when the wave leaves you"],
      strength: [60, "How hard the ring bends the room, in pixels"],
      speed: [1700, "How fast the ring travels, in pixels per second"],
      width: [110, "Thickness of the ring, in pixels"],
      glow: [30, "Brightness of the ring's light edge, as a percent (0: none)"],
      originY: ["", "Height the wave starts from, as a percent from the top (empty: your face)"],
    },
    run(ctx) {
      const at = ctx.num("at", 0, ctx.length);
      const strength = ctx.num("strength", 0, 110);
      const speed = ctx.num("speed", 200, 6000) / 4;
      const width = ctx.num("width", 20, 600) / 4;
      const glow = ctx.num("glow", 0, 100) / 100;
      const b = ctx.box();
      const cx = (b.centreX / 4).toFixed(1);
      const cy = ((ctx.values.originY ? (Number(ctx.values.originY) / 100) * 1920 : b.headTop + 200) / 4).toFixed(1);
      // Worked out on a small grid (a quarter of the size) and scaled up, which keeps it quick.
      const r = `hypot(X-${cx},Y-${cy})`;
      const ring = `(gt(T,${at})*exp(-pow((${r}-${speed}*(T-${at}))/${width},2))*max(0,1-${speed}*(T-${at})/620))`;
      const map = (axis) => `color=c=gray:s=270x480:r=30,format=gray,geq=lum='128+${strength}*${ring}*(${axis})/max(${r},1)'`;
      ctx.compose("Sending the wave out", [
        "-f", "lavfi", "-i", map(`X-${cx}`), "-f", "lavfi", "-i", map(`Y-${cy}`),
        "-f", "lavfi", "-i", `color=c=black:s=270x480:r=30,format=gray,geq=lum='255*${glow}*${ring}'`,
        "-f", "lavfi", "-i", "color=c=0xf0e8e0:s=1080x1920:r=30", ...ctx.CUT,
      ],
        `[1:v]scale=1080:1920:flags=bilinear,format=gbrp[mx];[2:v]scale=1080:1920:flags=bilinear,format=gbrp[my];` +
          `[0:v]format=gbrp[src];[src][mx][my]displace=edge=mirror,format=yuv420p[bent];` +
          `[3:v]scale=1080:1920:flags=bilinear,format=gray[gm];[4:v][gm]alphamerge[light];` +
          `[bent][light]overlay=0:0:shortest=1[lit];[lit][5:v]overlay=0:0,format=yuv420p[v]`);
    },
  },

  "impact-frame": {
    about: "Comic-book hit on one word: a negative flash, then an ink-and-speed-lines frame, then a hard punch-in",
    settings: {
      at: [0.5, "Seconds into the stretch when it hits"],
      colour: ["#f5cf45", "Colour of the speed-lines frame"],
      punch: [0.35, "Seconds the punch-in holds after the hit (0: none)"],
      zoom: [14, "How far the punch-in pushes, as a percent"],
    },
    run(ctx) {
      const at = ctx.num("at", 0, ctx.length);
      const punch = ctx.num("punch", 0, ctx.length);
      const zoom = 1 + ctx.num("zoom", 0, 60) / 100;
      const b = ctx.box();
      const fx = b.centreX;
      const fy = b.headTop + 190;
      const f = (n) => (at + n / 30).toFixed(3);
      const ang = `atan2(Y-${fy.toFixed(0)},X-${fx.toFixed(0)})`;
      const lines = ctx.still("speed-lines",
        `color=c=black:s=1080x1920,format=rgba,geq=r=20:g=32:b=26:a='255*gt(sin(${ang}*29)+0.8*sin(${ang}*67+1)+0.6*sin(${ang}*113+2),1.15)*gt(hypot(X-${fx.toFixed(0)},Y-${fy.toFixed(0)}),430+90*sin(${ang}*41))'`);
      const cw = Math.round(1080 / zoom / 2) * 2;
      const ch = Math.round(1920 / zoom / 2) * 2;
      const zx = Math.round(Math.max(0, Math.min(1080 - cw, fx - cw / 2)));
      const zy = Math.round(Math.max(0, Math.min(1920 - ch, fy - ch / 2)));
      ctx.compose("Landing the hit", ["-loop", "1", "-framerate", "30", "-i", lines, ...source(ctx, ctx.str("colour")), ...ctx.CUT],
        `[0:v]split=3[base][n0][z0];[n0]hue=s=0,eq=contrast=2.4,negate[neg];` +
          `[base][neg]overlay=0:0:enable='between(t,${f(0)},${f(1.5)})'[s1];` +
          `[3:v]hue=s=0,lutyuv=y='if(gt(val,92),235,16)'[ink];[2:v]format=yuv420p[g];[g][1:v]overlay=0:0[gl];[gl][ink]overlay=0:0[hit];` +
          `[s1][hit]overlay=0:0:enable='between(t,${f(1.6)},${f(5.5)})'[s2];` +
          `[z0]crop=${cw}:${ch}:${zx}:${zy},scale=1080:1920:flags=bicubic[z];` +
          `[s2][z]overlay=0:0:enable='between(t,${f(5.6)},${(at + 6 / 30 + punch).toFixed(3)})*gt(${punch},0)'[s3];` +
          `[s3]drawbox=x=0:y=0:w=1080:h=1920:color=white@0.8:t=fill:enable='between(t,${f(5.6)},${f(6.5)})',format=yuv420p[v]`);
    },
  },

  "head-stack": {
    about: "Copies of your head rise out of your own and stack upward, like a totem",
    settings: {
      heads: [4, "How many extra heads (1 to 8)"],
      headH: [20, "Height of your head, as a percent of the frame (look at a frame first)"],
      step: [72, "How far each head sits above the one below, as a percent of your head"],
      shrink: [90, "Each head is this percent of the one below it"],
      at: [0.3, "Seconds into the stretch when the first head rises"],
      stagger: [0.1, "Seconds between one head and the next"],
      out: [0, "Seconds before the end when the heads drop back in (0: they stay until the cut)"],
      headY: ["", "Top of your head as a percent from the top (empty: found from the cut-out)"],
    },
    run(ctx) {
      const count = Math.round(ctx.num("heads", 1, 8));
      const hh = (ctx.num("headH", 5, 60) / 100) * 1920;
      const step = ctx.num("step", 20, 150) / 100;
      const shrink = ctx.num("shrink", 50, 100) / 100;
      const at = ctx.num("at", 0, ctx.length);
      const stagger = ctx.num("stagger", 0, 2);
      const out = ctx.num("out", 0, ctx.length);
      const top = Math.max(0, Math.round(ctx.box().headTop - 12));
      const band = ctx.box([top, hh]);
      const x0 = Math.max(0, Math.floor((band.x1 - 16) / 2) * 2);
      const w0 = Math.min(1080 - x0, Math.ceil((band.x2 - band.x1 + 32) / 2) * 2);
      const h0 = Math.min(1920 - top, Math.round(hh / 2) * 2);
      const parts = [`[1:v]split=${count + 1}${Array.from({ length: count + 1 }, (_, i) => `[s${i}]`).join("")}`];
      let last = "[0:v]";
      let y = top;
      const spots = [];
      for (let k = 1; k <= count; k++) {
        const size = shrink ** k;
        y -= step * hh * size;
        spots.push({ k, size, y });
      }
      // Highest head first, so each head covers the neck of the one above; you go on top of them all.
      for (const { k, size, y: endY } of spots.reverse()) {
        const w = Math.round((w0 * size) / 2) * 2;
        const h = Math.round((h0 * size) / 2) * 2;
        const start = at + (k - 1) * stagger;
        let e = ctx.ease(start, 0.3);
        if (out > 0) e += `*${ctx.leave(ctx.length - out, 0.25)}`;
        const x = Math.round(x0 + (w0 - w) / 2);
        parts.push(
          `[s${k}]crop=${w0}:${h0}:${x0}:${top},scale=${w}:${h},format=rgba,split[p${k}][q${k}]`,
          `[q${k}]alphaextract[a${k}]`,
          `gradients=s=${w}x${h}:r=30:c0=white:c1=black:nb_colors=2:x0=0:y0=${Math.round(h * 0.78)}:x1=0:y1=${h - 2}:speed=0,format=gray[g${k}]`,
          `[a${k}][g${k}]blend=all_mode=multiply:shortest=1[m${k}]`,
          `[p${k}][m${k}]alphamerge[c${k}]`,
          `${last}[c${k}]overlay=x=${x}:y='${top}+(${(endY - top).toFixed(1)})*${e}':enable='gte(t,${start.toFixed(3)})'[o${k}]`,
        );
        last = `[o${k}]`;
      }
      parts.push(`${last}[s0]overlay=0:0,format=yuv420p[v]`);
      ctx.compose("Stacking the heads", ctx.CUT, parts.join(";"));
    },
  },

  "double-exposure": {
    about: "A picture or video shows inside your silhouette, blended with your face, on a plain ground",
    settings: {
      image: ["", "The picture or video to put inside you (needed)"],
      ground: [FOREST, "What is around you: a colour, or room to keep your own room, dimmed"],
      at: [0, "Seconds into the stretch when it starts"],
      out: [0, "Seconds before the end when it stops (0: it stays until the cut)"],
      drift: [14, "How fast the picture drifts inside you, in pixels per second"],
      face: [55, "How much of your own face shows through, as a percent"],
    },
    run(ctx) {
      const image = ctx.str("image");
      if (!image) ctx.fail('double-exposure needs a picture or video: --set image=/path/to/picture.jpg');
      const ground = ctx.str("ground");
      const at = ctx.num("at", 0, ctx.length);
      const out = ctx.num("out", 0, ctx.length);
      const drift = ctx.num("drift", 0, 200);
      const face = ctx.num("face", 0, 100) / 100;
      const room = ground === "room";
      ctx.compose("Blending the picture into you", [...source(ctx, image), ...ctx.CUT, ...(room ? [] : source(ctx, ground))],
        `[1:v]scale=1296:2304:force_original_aspect_ratio=increase,crop=1296:2304,setsar=1,fps=30,crop=1080:1920:x='min(216,t*${drift})':y=192,format=gbrp[img];` +
          `[2:v]split[c1][c2];[c1]hue=s=0,eq=contrast=1.3:brightness=${(face * 0.5 - 0.42).toFixed(2)},format=gbrp[me];` +
          `[me][img]blend=all_mode=screen[mix];[c2]alphaextract[al];[mix][al]alphamerge[inner];` +
          (room ? `[0:v]split[base][r0];[r0]eq=brightness=-0.3:saturation=0.25[g];` : `[0:v]null[base];[3:v]format=yuv420p[g];`) +
          `[g][inner]overlay=0:0:shortest=1[x];[base][x]overlay=0:0:enable='between(t,${at},${(ctx.length - out).toFixed(3)})',format=yuv420p[v]`);
    },
  },

  "blow-away": {
    about: "You break into grains that drift off on the wind, leaving the empty room (or gather out of dust, with mode=in)",
    settings: {
      at: [0.4, "Seconds into the stretch when you start to go (with mode=in: seconds before the end when you are whole)"],
      mode: ["out", "out: you blow away. in: you gather out of dust"],
      wind: [900, "Wind speed in pixels per second (negative blows to the left)"],
      spread: [1.1, "Seconds it takes for the wave to pass through all of you"],
      life: [0.9, "Seconds a grain lasts before it fades"],
      grain: [4, "Size of the grains, in pixels (2 to 12)"],
      lift: [160, "How much the grains rise as they go, in pixels per second"],
      room: ["", "Path to a photo or video of your empty room, shot from the same spot (empty: the room is filled in for you, softly)"],
      headY: ["", "Top of your head as a percent from the top (empty: found from the cut-out)"],
    },
    async run(ctx) {
      const mode = ctx.str("mode");
      if (!["out", "in"].includes(mode)) ctx.fail('blow-away: "mode" must be out or in.');
      await blowAway(ctx, {
        plate: ctx.str("room") ? source(ctx, ctx.str("room")) : ["-i", await ctx.plate()], mode,
        at: ctx.num("at", 0, ctx.length), wind: ctx.num("wind", -4000, 4000), spread: ctx.num("spread", 0.1, 10),
        life: ctx.num("life", 0.1, 5), grain: Math.round(ctx.num("grain", 2, 12)), lift: ctx.num("lift", -600, 600),
      });
    },
  },

  "incoming-call": {
    about: "A call card drops in at the top, rings, and gets picked up",
    composition: "incoming-call", layers: ["front"],
  },
  "comment-drop": {
    about: "The comment you are answering drops in above you",
    composition: "comment-drop", layers: ["front"],
  },
  "search-suggest": {
    about: "A search bar types your question and the suggestions drop down, one gets picked",
    composition: "search-suggest", layers: ["front"],
  },
  "live-cursor": {
    about: "A named cursor glides in and drags a selection box around your head",
    composition: "live-cursor", layers: ["front"], needsBox: true,
  },
  "voice-note": {
    about: "A voice-note card whose waveform is your real voice, playing through as you talk",
    composition: "voice-note", layers: ["front"],
    // The bars are the loudness of your own voice across the stretch.
    prepare(ctx, at) {
      const count = 36;
      const seconds = ctx.length - at;
      const log = ctx.run("Listening to your voice", "ffmpeg", [
        "-v", "info", "-y", "-ss", String(at), "-i", ctx.clip, "-vn",
        "-af", `aresample=8000,asetnsamples=n=${Math.max(64, Math.floor((seconds * 8000) / count))},astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level`,
        "-f", "null", "-",
      ]);
      const db = [...log.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) => (m[1] === "-inf" ? -90 : Number(m[1]))).slice(0, count);
      if (db.length < 4) return { seconds: String(seconds) };
      const top = Math.max(...db);
      const bars = db.map((d) => Math.round(Math.max(8, Math.min(100, 100 + (d - top) * 3.2))));
      return { bars: bars.join("|"), seconds: String(seconds) };
    },
  },
  "day-dial": {
    about: "A big dial of days (or anything else) spins behind your head and lands on one",
    composition: "day-dial", layers: ["behind"], needsBox: true,
  },
  "paper-tear": {
    about: "A strip of the room is ripped away behind your head, with your words in the tear",
    composition: "paper-tear", layers: ["behind"], needsBox: true,
  },

  "code-body": {
    about: "Your silhouette fills with scrolling code, with your face showing through it",
    settings: {
      at: [0.3, "Seconds into the stretch when it starts"],
      out: [0, "Seconds before the end when it stops (0: it stays until the cut)"],
      code: ["", "Path to a text file with your own code (empty: a built-in sample)"],
      dim: [25, "How much the room darkens, as a percent"],
    },
    async run(ctx) {
      const at = ctx.num("at", 0, ctx.length);
      const out = ctx.num("out", 0, ctx.length);
      const dim = ctx.num("dim", 0, 90) / 100;
      const file = ctx.str("code").replace(/^~(?=\/)/, process.env.HOME ?? "~");
      if (file && !fs.existsSync(file)) ctx.fail(`code-body could not find "${file}".`);
      const text = file ? fs.readFileSync(file, "utf8").split(/\r?\n/).slice(0, 16).join("\n") : "";
      const code = ctx.layer("code-rain", "all", { text }, "mp4");
      ctx.compose("Filling you with code", ["-stream_loop", "-1", "-i", code, ...ctx.CUT],
        // Your face, dimmed and tinted green, with the bright code laid over it.
        `[1:v]fps=30,eq=contrast=1.5:brightness=0.06,format=gbrp[code];[2:v]split[c1][c2];` +
          `[c1]hue=s=0,eq=contrast=1.2:brightness=-0.12,format=gbrp,colorchannelmixer=rr=0.5:gg=0.8:bb=0.6[me];` +
          `[me][code]blend=all_mode=screen:shortest=1[mix];[c2]alphaextract[al];[mix][al]alphamerge[inner];` +
          `[0:v]split[base][r0];[r0]eq=brightness=${(-dim).toFixed(2)}:saturation=0.5[dark];[dark][inner]overlay=0:0:shortest=1[x];` +
          `[base][x]overlay=0:0:enable='between(t,${at},${(ctx.length - out).toFixed(3)})',format=yuv420p[v]`);
    },
  },

  "layer-explode": {
    about: "The shot pulls apart into three labelled layers: the room, you, and the captions",
    composition: "layer-explode",
    settings: {
      at: [0.3, "Seconds into the stretch when the shot pulls apart"],
      ground: [FOREST, "Colour behind the layers"],
    },
    async run(ctx) {
      const at = ctx.num("at", 0, ctx.length);
      const vars = { ...ctx.values };
      delete vars.at;
      delete vars.ground;
      const front = ctx.layer("layer-explode", "front", vars);
      const e = ctx.ease(at, 0.5);
      const hold = Math.max(0, ctx.length - at - 3.5).toFixed(2);
      const edge = "x=0:y=0:w=604:h=1076:color=0xf0e8e0@0.6:t=2";
      ctx.compose("Pulling the shot apart", [
        "-i", await ctx.plate(), ...ctx.CUT, ...source(ctx, ctx.str("ground")), "-i", front,
        "-f", "lavfi", "-i", "color=c=0x1a2821@0.45:s=604x1076:r=30,format=rgba",
      ],
        `[1:v]scale=604:1076,drawbox=${edge}[room];[2:v]scale=604:1076[me0];[5:v][me0]overlay=0:0:shortest=1,drawbox=${edge}[me];` +
          `[3:v]format=yuv420p[g];[g][room]overlay=x='238-168*${e}':y='422-222*${e}':shortest=1[a];[a][me]overlay=238:422[b];` +
          `[4:v]setpts=PTS+${at}/TB,tpad=stop_mode=clone:stop_duration=${hold}[f];[b][f]overlay=0:0:enable='gte(t,${at})'[c];` +
          `[0:v][c]overlay=0:0:enable='gte(t,${at})',format=yuv420p[v]`);
    },
  },

  "press-front": {
    about: "You become the picture on a newspaper front page, under your own headline",
    composition: "press-front",
    settings: {
      at: [0.3, "Seconds into the stretch when the front page lands"],
      tone: ["bw", "The picture: bw (black and white) or colour"],
    },
    run(ctx) {
      const at = ctx.num("at", 0, ctx.length);
      const tone = ctx.str("tone");
      const vars = { ...ctx.values };
      delete vars.at;
      delete vars.tone;
      const page = ctx.layer("press-front", "all", vars);
      const y0 = Math.round(Math.max(0, Math.min(1920 - 968, ctx.box().headTop - 230)));
      const hold = Math.max(0, ctx.length - at - 3.5).toFixed(2);
      ctx.compose("Printing the front page", ["-f", "lavfi", "-i", "color=c=0xefe8dc:s=1080x1920:r=30", "-i", page],
        `[0:v]split[base][p0];[p0]crop=1080:968:0:${y0},scale=960:860${tone === "colour" ? "" : ",hue=s=0,eq=contrast=1.2"}[pic];` +
          `[1:v]format=yuv420p[bg];[bg][pic]overlay=60:720:shortest=1[x];` +
          `[2:v]setpts=PTS+${at}/TB,tpad=stop_mode=clone:stop_duration=${hold}[pg];[x][pg]overlay=0:0[y];` +
          `[base][y]overlay=0:0:enable='gte(t,${at})',format=yuv420p[v]`);
    },
  },

  "banknote": {
    about: "You become the engraved portrait on a banknote",
    composition: "banknote",
    settings: {
      at: [0.3, "Seconds into the stretch when the note lands"],
      ink: [FOREST, "Colour of the ink"],
      lines: [7, "Spacing of the engraving lines, in pixels (smaller is finer)"],
    },
    run(ctx) {
      const at = ctx.num("at", 0, ctx.length);
      const lines = ctx.num("lines", 4, 20);
      const ink = ctx.str("ink");
      if (!isColour(ink)) ctx.fail('banknote: "ink" must be a colour like #203028.');
      const vars = { ...ctx.values };
      delete vars.at;
      delete vars.ink;
      delete vars.lines;
      const note = ctx.layer("banknote", "all", vars);
      const b = ctx.box();
      const x0 = Math.round(Math.max(0, Math.min(1080 - 912, b.centreX - 456)));
      const y0 = Math.round(Math.max(0, Math.min(1920 - 1200, b.headTop - 270)));
      // Wavy lines that get thicker where you are darker, like an engraving.
      const pattern = ctx.still("engraving", `color=c=black:s=760x1000,format=gray,geq=lum='127.5+127.5*sin(2*PI*(Y+5*sin(X/38))/${lines})'`);
      const hold = Math.max(0, ctx.length - at - 3.5).toFixed(2);
      ctx.compose("Engraving the note", [
        "-loop", "1", "-framerate", "30", "-i", pattern,
        "-f", "lavfi", "-i", "color=c=0xe9e3cf:s=760x1000:r=30", "-f", "lavfi", "-i", `color=c=${hex(ink)}:s=760x1000:r=30`,
        "-f", "lavfi", "-i", "color=c=0xe9e3cf:s=1080x1920:r=30", "-i", note,
      ],
        `[0:v]split[base][p0];[p0]crop=912:1200:${x0}:${y0},scale=760:1000,hue=s=0,eq=contrast=1.4:brightness=0.05,format=gray[g];` +
          `[1:v]format=gray[pt];[g][pt]blend=all_mode=average:shortest=1,lut=y='clip((val-112)*9,0,255)',format=gbrp[m];` +
          `[2:v]format=gbrp[pp];[3:v]format=gbrp[ii];[ii][pp][m]maskedmerge,format=yuv420p[eng];` +
          `[4:v]format=yuv420p[bg];[bg][eng]overlay=160:430:shortest=1[x];` +
          `[5:v]setpts=PTS+${at}/TB,tpad=stop_mode=clone:stop_duration=${hold}[nt];[x][nt]overlay=0:0[y];` +
          `[base][y]overlay=0:0:enable='gte(t,${at})',format=yuv420p[v]`);
    },
  },
};
