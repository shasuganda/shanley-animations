// Small helpers shared by the effects drawn over your own footage.
window.fx = (() => {
  const v = window.__hyperframes.getVariables();
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (v.look === "plum") document.documentElement.classList.add("plum");
  return {
    v,
    esc,
    // Words in *stars* take the accent colour.
    rich: (s) => esc(s).replace(/\*(.+?)\*/g, "<em>$1</em>"),
    num: (key, fallback) => (Number.isFinite(parseFloat(v[key])) ? parseFloat(v[key]) : fallback),
    list: (s) => String(s).split("|").map((p) => p.trim()).filter(Boolean),
    el: (id) => document.getElementById(id),
    hide: (id) => (document.getElementById(id).style.display = "none"),
    // Fixed "random" numbers, so every render comes out the same.
    rnd: (n) => {
      const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    },
    // Show only the part this pass is drawing, then hand the timeline to the renderer.
    done(id, tl) {
      const off = v.layer === "behind" ? ".front" : v.layer === "front" ? ".behind" : null;
      if (off) document.querySelectorAll(off).forEach((n) => (n.style.display = "none"));
      window.__timelines = window.__timelines || {};
      window.__timelines[id] = tl;
      tl.seek(0);
    },
  };
})();
