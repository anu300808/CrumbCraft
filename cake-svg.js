"use strict";
/* ---------- TOP VIEW (SVG) ---------- */
let cakeView = "side";
function setCakeView(v) {
  cakeView = v;
  $("cake").classList.toggle("hidden", v !== "side");
  $("cakeTop").classList.toggle("hidden", v !== "top");
  document.querySelectorAll(".view-toggle button").forEach((b) => {
    const on = b.dataset.view === v;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on);
  });
}
const svgPath = (pts) => "M" + pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L") + "Z";
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  return "#" + [n >> 16, (n >> 8) & 255, n & 255]
    .map((v) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt).toString(16).padStart(2, "0")).join("");
}
function outline(shape, cx, cy, r, n = 240) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * Math.PI, c = Math.cos(t), s = Math.sin(t);
    if (shape === "heart") {
      const k = r / 16;
      pts.push([cx + 16 * s ** 3 * k, cy - (13 * c - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5) * k]);
    } else if (shape === "square") {
      pts.push([cx + r * 0.88 * Math.sign(c) * Math.abs(c) ** 0.25, cy + r * 0.88 * Math.sign(s) * Math.abs(s) ** 0.25]);
    } else pts.push([cx + r * c, cy + r * s]);
  }
  return pts;
}
function evenDots(pts, gap) {
  const out = []; let acc = gap;
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length];
    acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc >= gap) { out.push(a); acc = 0; }
  });
  return out;
}
function topViewSVG(cfg) {
  const fr = byId(FROSTINGS, cfg.frosting), C = 150;
  const tiers = cfg.weight >= 4500 ? 3 : cfg.weight >= 3000 ? 2 : 1;
  const radii = [[120], [120, 84], [120, 94, 68]][tiers - 1], rT = radii[tiers - 1];
  const light = lum(fr.color) > 0.55;
  const edge = shade(fr.color, light ? -0.14 : 0.3), ink = light ? "#5a3a29" : "#fff3d6";
  let g = `<path d="${svgPath(outline(cfg.shape, C, C, 134))}" fill="#e8dccb" stroke="#d3c3ad"/>`;
  radii.forEach((r, i) => {
    g += `<path d="${svgPath(outline(cfg.shape, C, C, r))}" fill="${fr.color}" stroke="${shade(fr.color, light ? -0.3 : 0.15)}" stroke-width="1.5"/>`;
    g += evenDots(outline(cfg.shape, C, C, r - 7), 12 - i * 1.5)
      .map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(4.2 - i * 0.6).toFixed(1)}" fill="${edge}"/>`).join("");
  });
  if (cfg.fondant) {
    [[-0.5, -0.5], [0.5, -0.5], [0, 0.58]].forEach(([dx, dy]) => {
      const x = C + dx * rT, y = C + dy * rT;
      for (let k = 0; k < 5; k++) {
        const a = (k * 72 * Math.PI) / 180;
        g += `<circle cx="${(x + Math.cos(a) * 7).toFixed(1)}" cy="${(y + Math.sin(a) * 7).toFixed(1)}" r="5" fill="#e0527a"/>`;
      }
      g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="#ffd45e"/>`;
    });
  }
  const msg = cfg.message || "", words = msg.split(" ");
  let lines = [msg];
  if (msg.length > 14 && words.length > 1) {
    let best = 1, bd = 1e9;
    for (let i = 1; i < words.length; i++) {
      const d = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
      if (d < bd) { bd = d; best = i; }
    }
    lines = [words.slice(0, best).join(" "), words.slice(best).join(" ")];
  }
  const fs = Math.min(22, (rT * 1.25) / (Math.max(...lines.map((l) => l.length), 1) * 0.55));
  lines.forEach((l, i) => {
    const y = C + (i - (lines.length - 1) / 2) * fs * 1.15 + fs * 0.3;
    g += `<text x="${C}" y="${y.toFixed(1)}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-weight="700" font-size="${fs.toFixed(1)}" fill="${ink}">${esc(l)}</text>`;
  });
  return `<svg viewBox="0 0 300 300" role="img" aria-label="Top view of the cake">${g}</svg>`;
}


/* ---------- ORDER PROGRESS CAKE (animated, shown to customers) ---------- */
function trackerSVG(status, cfg) {
  const fl = byId(FLAVORS, cfg.flavor), fr = byId(FROSTINGS, cfg.frosting);
  const s = CrumbLogic.STATUSES.indexOf(status), sponge = fl ? fl.sponge : "#d9a24b", frost = fr ? fr.color : "#fff3d6";
  let g = '<ellipse cx="60" cy="98" rx="50" ry="8" fill="#e8dccb"/>';
  g += s <= 0
    ? `<rect x="25" y="52" width="70" height="42" rx="6" fill="none" stroke="${sponge}" stroke-width="3" stroke-dasharray="6 5" class="t-pulse"/>`
    : `<rect x="25" y="52" width="70" height="42" rx="6" fill="${sponge}"${s === 1 ? ' class="t-rise"' : ""}/>`;
  if (s === 1) g += [40, 60, 80].map((x, i) => `<path d="M${x} 46q-6-8 0-14t0-12" fill="none" stroke="#b9a99a" stroke-width="3" stroke-linecap="round" class="t-steam" style="animation-delay:${i * 0.5}s"/>`).join("");
  if (s >= 2) g += `<path d="M25 56Q25 46 35 46H85Q95 46 95 56V60${"q-5 8-10 0".repeat(7)}z" fill="${frost}" stroke="#d3c3ad"/>`;
  if (s === 2) g += '<rect x="58" y="30" width="4" height="16" rx="1" fill="#e0527a"/><ellipse cx="60" cy="26" rx="3.5" ry="5" fill="#ffb300" class="t-flame"/>';
  if (s === 3) g += '<circle cx="98" cy="26" r="13" fill="#3a9d5d"/><path d="M91 26l5 5 9-10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
  return `<svg viewBox="0 0 120 110" class="tracker" role="img" aria-label="Cake status: ${esc(status)}">${g}</svg>`;
}
