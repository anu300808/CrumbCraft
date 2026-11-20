"use strict";

/* ---------- DATA ---------- */
const CAPACITY = 25;
const BASE_PRICE_PER_KG = 60000;   // paise (₹600/kg)
const FONDANT_FEE = 25000;         // paise
const EARLY_BIRD_PCT = 10;
const STORE_KEY = "crumbcraft_orders_v1";

const BASE_BOM = { Flour: 350, Sugar: 280, "Whipping Cream": 300, Butter: 150, "Dark Chocolate": 50 }; // g per kg

const FLAVORS = [
  { id: "choc",   name: "Chocolate Truffle", pct: 120, bom: { Flour: 400, "Dark Chocolate": 250 }, sponge: "#4a2a1b" },
  { id: "red",    name: "Red Velvet",        pct: 115, bom: { "Dark Chocolate": 60 },              sponge: "#a3202f" },
  { id: "mango",  name: "Mango",             pct: 125, bom: { Sugar: 300 },                         sponge: "#f2b83a" },
  { id: "bf",     name: "Black Forest",      pct: 110, bom: { "Dark Chocolate": 120 },              sponge: "#3b2218" },
  { id: "van",    name: "Vanilla",           pct: 100, bom: { "Dark Chocolate": 0 },                sponge: "#f3dfae" },
  { id: "bs",     name: "Butterscotch",      pct: 105, bom: { Sugar: 320, "Dark Chocolate": 0 },    sponge: "#d9a24b" },
  { id: "pine",   name: "Pineapple",         pct: 100, bom: { "Dark Chocolate": 0 },                sponge: "#f5e08a" },
  { id: "straw",  name: "Strawberry",        pct: 105, bom: { "Dark Chocolate": 0 },                sponge: "#f3a6b5" },
  { id: "mocha",  name: "Coffee Mocha",      pct: 120, bom: { "Dark Chocolate": 150 },              sponge: "#7a5236" },
  { id: "rasm",   name: "Rasmalai",          pct: 135, bom: { Sugar: 330, "Dark Chocolate": 0 },    sponge: "#f1e3b8" }
];

const FROSTINGS = [
  { id: "bc",   name: "Buttercream",         fee: 0,     color: "#fff3d6" },
  { id: "wc",   name: "Whipped Cream",       fee: 0,     color: "#ffffff" },
  { id: "gan",  name: "Chocolate Ganache",   fee: 15000, color: "#3a2218" },
  { id: "cc",   name: "Cream Cheese",        fee: 20000, color: "#fff8e7" },
  { id: "fon",  name: "Pastel Fondant",      fee: 30000, color: "#f7b6d2" }
];

const SHAPES = [
  { id: "round",  name: "Round",  fee: 0 },
  { id: "square", name: "Square", fee: 0 },
  { id: "heart",  name: "Heart",  fee: 10000 }
];

const FESTIVALS = [
  { date: "2026-12-24", label: "Christmas Eve" },
  { date: "2026-12-25", label: "Christmas" },
  { date: "2026-12-31", label: "New Year's Eve" },
  { date: "2027-02-14", label: "Valentine's Day" }
];

const SEED_PAY = [
  { method: "upi", label: "UPI", detail: "UPI · ra***@okhdfc", status: "Paid", txn: "TXNSEED1" },
  { method: "card", label: "Card", detail: "Visa •••• 4242", status: "Paid", txn: "TXNSEED2" },
  { method: "net", label: "Net banking", detail: "HDFC Bank", status: "Paid", txn: "TXNSEED3" },
  { method: "cash", label: "Cash", detail: "Cash at pickup", status: "Due at handover", txn: "" }
];

/* ---------- HELPERS ---------- */
const $ = (id) => document.getElementById(id);
const fmt = (paise) =>
  "₹" + (paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: paise % 100 ? 2 : 0,
    maximumFractionDigits: 2
  });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const byId = (arr, id) => arr.find((x) => x.id === id);
const kg = (g) => g / 1000;
const localIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isoToday = () => localIso(new Date());
const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return localIso(d); };
const prettyDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const daysUntil = (iso) => Math.round((new Date(iso + "T00:00:00") - new Date(isoToday() + "T00:00:00")) / 864e5);
const festivalOn = (iso) => FESTIVALS.find((f) => f.date === iso);

/* ---------- STORAGE / SEED ---------- */
function seedOrders() {
  const dates = [
    ...Array(9).fill("2026-12-24"),
    ...Array(3).fill("2026-12-25"),
    ...Array(3).fill("2026-12-31")
  ];
  const names = ["Aarav", "Priya", "Kiran", "Sneha", "Vikram", "Ananya", "Rohit", "Meera", "Arjun", "Divya", "Imran", "Neha", "Suresh", "Pooja", "Karthik"];
  const weights = [1000, 2000, 1500, 3000, 500, 2500, 1000, 2000, 1500, 1000, 2000, 3000, 1500, 1000, 2500];
  return dates.map((date, i) => {
    const cfg = {
      weight: weights[i], flavor: FLAVORS[i % FLAVORS.length].id,
      shape: "round", frosting: "bc", fondant: false, message: "Season's Greetings"
    };
    const p = calcPrice(cfg, date);
    return {
      id: "CC-SEED" + String(i + 1).padStart(2, "0"),
      customer: names[i], phone: "9000000000", mode: "Pickup",
      date, slot: "10:00 AM – 12:00 PM", cfg, total: p.total, placedOn: isoToday(),
      payment: SEED_PAY[i % 4]
    };
  });
}

function storageWarn(e) {
  console.warn("CrumbCraft: browser storage unavailable", e);
  $("storageWarn").classList.remove("hidden");
}

function loadOrders() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { storageWarn(e); }
  const s = seedOrders();
  saveOrders(s);
  return s;
}
function saveOrders(list) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) { storageWarn(e); }
}
let orders = loadOrders();

/* ---------- PRICE ENGINE (integer paise) ---------- */
function calcPrice(cfg, date) {
  const flavor = byId(FLAVORS, cfg.flavor);
  const frosting = byId(FROSTINGS, cfg.frosting);
  const shape = byId(SHAPES, cfg.shape);

  const base = Math.round((BASE_PRICE_PER_KG * cfg.weight) / 1000);
  const flavorAddon = Math.round((base * (flavor.pct - 100)) / 100);
  const frostingFee = frosting.fee;
  const shapeFee = shape.fee;
  const fondant = cfg.fondant ? FONDANT_FEE : 0;
  const subtotal = base + flavorAddon + frostingFee + shapeFee + fondant;

  let discount = 0, discountLabel = "";
  const fest = date && festivalOn(date);
  if (fest && daysUntil(date) >= 7) {
    discount = Math.round((subtotal * EARLY_BIRD_PCT) / 100);
    discountLabel = `Early-bird ${EARLY_BIRD_PCT}% (${fest.label})`;
  }
  return { base, flavorAddon, frostingFee, shapeFee, fondant, subtotal, discount, discountLabel, total: subtotal - discount };
}

/* ---------- CAPACITY ---------- */
const bookedOn = (date) => orders.filter((o) => o.date === date).length;

function capacityInfo(date) {
  const booked = bookedOn(date);
  const pct = Math.min(100, Math.round((booked / CAPACITY) * 100));
  const left = CAPACITY - booked;
  return { booked, pct, left, full: left <= 0 };
}

/* ---------- CUSTOMER UI ---------- */
function fillSelect(el, items, withFee) {
  el.innerHTML = items.map((i) =>
    `<option value="${i.id}">${esc(i.name)}${withFee && i.fee ? ` (+${fmt(i.fee)})` : ""}${i.pct && i.pct > 100 ? ` (+${i.pct - 100}%)` : ""}</option>`
  ).join("");
}

function currentCfg() {
  return {
    weight: Number($("weight").value),
    flavor: $("flavor").value,
    shape: $("shape").value,
    frosting: $("frosting").value,
    fondant: $("fondant").checked,
    message: $("message").value.trim()
  };
}

function renderPrice() {
  const cfg = currentCfg();
  const date = $("date").value;
  const p = calcPrice(cfg, date);
  const flavor = byId(FLAVORS, cfg.flavor);
  const frosting = byId(FROSTINGS, cfg.frosting);
  const shape = byId(SHAPES, cfg.shape);

  $("weightLabel").textContent = kg(cfg.weight) + " kg";

  const rows = [
    [`Base (${kg(cfg.weight)} kg × ${fmt(BASE_PRICE_PER_KG)}/kg)`, p.base],
    [`${flavor.name} flavor add-on`, p.flavorAddon],
    [`${frosting.name} frosting`, p.frostingFee],
    [`${shape.name} shape`, p.shapeFee],
    ["Fondant decorations", p.fondant]
  ].filter((r) => r[1] > 0 || r[0].startsWith("Base"));

  let html = rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${fmt(r[1])}</td></tr>`).join("");
  if (p.discount) html += `<tr class="discount"><td>${esc(p.discountLabel)}</td><td>−${fmt(p.discount)}</td></tr>`;
  html += `<tr class="total"><td>Total</td><td>${fmt(p.total)}</td></tr>`;
  $("priceRows").innerHTML = html;

  renderCake(cfg);
  updatePayBtn(p.total);
}

function renderCake(cfg) {
  const flavor = byId(FLAVORS, cfg.flavor);
  const frosting = byId(FROSTINGS, cfg.frosting);
  const tiers = cfg.weight >= 4500 ? 3 : cfg.weight >= 3000 ? 2 : 1;
  const widths = [210, 160, 115];
  let html = cfg.fondant ? '<div class="topper">🌸</div>' : "";
  html += `<div class="cake-msg">${esc(cfg.message || "")}</div>`;
  for (let i = tiers - 1; i >= 0; i--) {
    html += `<div class="tier ${cfg.shape}" style="width:${widths[i]}px;--frost:${frosting.color};--sponge:${flavor.sponge}"></div>`;
  }
  $("cake").innerHTML = html;
  $("cakeTop").innerHTML = topViewSVG(cfg);
  $("cakeCaption").textContent = `${tiers}-tier ${flavor.name} with ${frosting.name}`;
}

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

/* ---------- PAYMENT ---------- */
const BANKS = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", "Punjab National Bank"];
const PAY_LABEL = { upi: "UPI", card: "Card", net: "Net banking", cash: "Cash" };
let lastTotal = 0;
const payMethod = () => document.querySelector('input[name="pay"]:checked').value;
const luhn = (n) => { let s = 0, dbl = false; for (let i = n.length - 1; i >= 0; i--) { let x = +n[i]; if (dbl) { x *= 2; if (x > 9) x -= 9; } s += x; dbl = !dbl; } return s % 10 === 0; };
const cardBrand = (n) => /^4/.test(n) ? "Visa" : /^(5[1-5]|2[2-7])/.test(n) ? "Mastercard" : /^3[47]/.test(n) ? "Amex" : /^(60|65|81|82|508)/.test(n) ? "RuPay" : "Card";
function updatePayBtn(total) {
  lastTotal = total;
  $("orderBtn").textContent = payMethod() === "cash" ? "Confirm pre-order (pay at handover)" : "Pay " + fmt(total) + " & confirm";
}
function showPayFields() {
  document.querySelectorAll(".pay-fields").forEach((f) => f.classList.toggle("hidden", f.dataset.for !== payMethod()));
  updatePayBtn(lastTotal);
}
// Returns [errorMessage | null, maskedDetail]. Full card number and CVV are never stored.
function checkPayment() {
  const m = payMethod();
  if (m === "upi") {
    const v = $("upiId").value.trim();
    if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(v)) return ["Enter a valid UPI ID, like name@bank.", ""];
    return [null, "UPI · " + v.slice(0, 2) + "***" + v.slice(v.indexOf("@"))];
  }
  if (m === "card") {
    const n = $("cardNo").value.replace(/\s/g, ""), em = $("cardExp").value.match(/^(0[1-9]|1[0-2])\/(\d{2})$/), now = new Date();
    if (!/^\d{13,19}$/.test(n) || !luhn(n)) return ["Enter a valid card number.", ""];
    if (!em) return ["Enter the card expiry as MM/YY.", ""];
    const yr = 2000 + +em[2];
    if (yr < now.getFullYear() || (yr === now.getFullYear() && +em[1] < now.getMonth() + 1)) return ["This card has expired.", ""];
    if (!/^\d{3,4}$/.test($("cardCvv").value.trim())) return ["Enter the 3 or 4 digit CVV.", ""];
    if ($("cardName").value.trim().length < 2) return ["Enter the name on the card.", ""];
    return [null, cardBrand(n) + " •••• " + n.slice(-4)];
  }
  if (m === "net") return $("bank").value ? [null, $("bank").value] : ["Choose your bank.", ""];
  return [null, "Cash at " + $("mode").value.toLowerCase()];
}

function renderCapacityBox() {
  const date = $("date").value;
  const box = $("capacityBox");
  if (!date) { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  const c = capacityInfo(date);
  const fill = $("capacityFill");
  fill.style.width = c.pct + "%";
  fill.className = c.full ? "full" : c.pct >= 80 ? "warn" : "";
  $("capacityText").textContent = c.full
    ? `${prettyDate(date)}: 100% booked – fully booked, please pick another date`
    : `${prettyDate(date)}: ${c.pct}% booked${c.left <= 5 ? ` – only ${c.left} slot${c.left === 1 ? "" : "s"} left!` : ` – ${c.left} slots available`}`;
}

function renderChips() {
  $("festivalChips").innerHTML = FESTIVALS
    .filter((f) => daysUntil(f.date) >= 1)
    .map((f) => `<button type="button" class="chip" data-date="${f.date}">${esc(f.label)}</button>`)
    .join("");
}

function validate() {
  const cfg = currentCfg();
  const date = $("date").value;
  const name = $("name").value.trim();
  const phone = $("phone").value.trim();
  if (!name) return "Please enter your name.";
  if (!/^\d{10}$/.test(phone)) return "Enter a valid 10-digit phone number.";
  if (!date) return "Please choose a delivery / pickup date.";
  if (daysUntil(date) < 1) return "Pre-orders must be for tomorrow or later.";
  if (capacityInfo(date).full) return "That date is fully booked. Please pick another date.";
  if (!cfg.message) return "Add a message for the cake (or write 'No message').";
  return checkPayment()[0] || "";
}

function placeOrder() {
  const err = validate();
  $("formError").textContent = err;
  if (err) return;

  const cfg = currentCfg(), date = $("date").value, p = calcPrice(cfg, date);
  const method = payMethod(), detail = checkPayment()[1];
  const btn = $("orderBtn");
  btn.disabled = true;
  btn.textContent = method === "cash" ? "Reserving your slot…" : "Processing payment…";

  setTimeout(() => {
    btn.disabled = false;
    updatePayBtn(lastTotal);
    if (capacityInfo(date).full) {
      $("formError").textContent = "That date just filled up. Please pick another date.";
      renderCapacityBox();
      return;
    }
    const order = {
      id: "CC-" + Date.now().toString(36).toUpperCase(),
      customer: $("name").value.trim(),
      phone: $("phone").value.trim(),
      mode: $("mode").value,
      date, slot: $("slot").value,
      cfg, total: p.total, placedOn: isoToday(),
      payment: {
        method, label: PAY_LABEL[method], detail,
        status: method === "cash" ? "Due at handover" : "Paid",
        txn: method === "cash" ? "" : "TXN" + Date.now().toString(36).toUpperCase()
      }
    };
    orders.push(order);
    saveOrders(orders);
    ["cardNo", "cardExp", "cardCvv"].forEach((id) => ($(id).value = ""));
    renderReceipt(order);
    renderCapacityBox();
    renderBaker();
  }, method === "cash" ? 300 : 1200);
}

function renderReceipt(o) {
  const flavor = byId(FLAVORS, o.cfg.flavor);
  const frosting = byId(FROSTINGS, o.cfg.frosting);
  const shape = byId(SHAPES, o.cfg.shape);
  const p = calcPrice(o.cfg, o.date);
  const pay = o.payment || { detail: "Not recorded", status: "" };
  const due = pay.status === "Due at handover";
  const el = $("receipt");
  el.classList.remove("hidden");
  el.innerHTML = `
    <h2>Digital Receipt</h2>
    <p class="center"><span class="status">✔ Order Confirmed</span></p>
    <div class="receipt-cake">${topViewSVG(o.cfg)}</div>
    <dl>
      <dt>Order ID</dt><dd>${esc(o.id)}</dd>
      <dt>Customer</dt><dd>${esc(o.customer)} (${esc(o.phone)})</dd>
      <dt>${esc(o.mode)} date</dt><dd>${prettyDate(o.date)}</dd>
      <dt>Time slot</dt><dd>${esc(o.slot)}</dd>
      <dt>Cake</dt><dd>${kg(o.cfg.weight)} kg ${esc(flavor.name)}, ${esc(shape.name)}</dd>
      <dt>Frosting</dt><dd>${esc(frosting.name)}${o.cfg.fondant ? " + fondant decorations" : ""}</dd>
      <dt>Message</dt><dd>"${esc(o.cfg.message)}"</dd>
      <dt>Payment</dt><dd>${esc(pay.detail)}</dd>
      <dt>Payment status</dt><dd>${pay.status ? (due ? "Due at handover" : "Paid ✔") : "—"}${pay.txn ? " · " + esc(pay.txn) : ""}</dd>
    </dl>
    <table class="price"><tbody>
      <tr><td>Base price</td><td>${fmt(p.base)}</td></tr>
      ${p.flavorAddon ? `<tr><td>Flavor add-on</td><td>${fmt(p.flavorAddon)}</td></tr>` : ""}
      ${p.frostingFee ? `<tr><td>Frosting</td><td>${fmt(p.frostingFee)}</td></tr>` : ""}
      ${p.shapeFee ? `<tr><td>Shape</td><td>${fmt(p.shapeFee)}</td></tr>` : ""}
      ${p.fondant ? `<tr><td>Fondant decorations</td><td>${fmt(p.fondant)}</td></tr>` : ""}
      ${p.discount ? `<tr class="discount"><td>${esc(p.discountLabel)}</td><td>−${fmt(p.discount)}</td></tr>` : ""}
      <tr class="total"><td>${due ? "Total due" : "Total paid"}</td><td>${fmt(o.total)}</td></tr>
    </tbody></table>
    <button class="ghost" onclick="window.print()">Print receipt</button>`;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- BAKER DASHBOARD ---------- */
function forecastFor(date) {
  const totals = {};
  let totalKg = 0;
  orders.filter((o) => o.date === date).forEach((o) => {
    const flavor = byId(FLAVORS, o.cfg.flavor);
    const bom = { ...BASE_BOM, ...flavor.bom };       // grams per kg
    const w = kg(o.cfg.weight);
    totalKg += w;
    for (const ing in bom) totals[ing] = (totals[ing] || 0) + w * bom[ing];
  });
  return { totals, totalKg };
}

function fmtWeight(g) {
  return g >= 1000 ? (g / 1000).toFixed(2).replace(/\.?0+$/, "") + " kg" : Math.round(g) + " g";
}

function renderBaker() {
  const dates = [...new Set(orders.map((o) => o.date))].sort();

  // capacity list
  $("capacityList").innerHTML = dates.map((d) => {
    const c = capacityInfo(d);
    const f = festivalOn(d);
    const cls = c.full ? "full" : c.pct >= 80 ? "warn" : "";
    return `<div class="cap-row">
      <div class="head"><span>${prettyDate(d)}${f ? " · " + esc(f.label) : ""}</span><b>${c.booked}/${CAPACITY}</b></div>
      <div class="bar"><span class="${cls}" style="width:${c.pct}%"></span></div>
      ${c.full ? '<small style="color:var(--full)">100% capacity – new orders blocked</small>' : ""}
    </div>`;
  }).join("") || '<p class="muted">No orders yet.</p>';

  // date selector (keep selection)
  const sel = $("forecastDate");
  const prev = sel.value;
  sel.innerHTML = dates.map((d) => `<option value="${d}">${prettyDate(d)}</option>`).join("");
  if (dates.includes(prev)) sel.value = prev;
  else if (dates.includes("2026-12-24")) sel.value = "2026-12-24";

  renderForecast();
}

function renderForecast() {
  const date = $("forecastDate").value;
  if (!date) { $("forecastRows").innerHTML = ""; $("orderRows").innerHTML = ""; $("forecastSummary").textContent = ""; return; }
  const { totals, totalKg } = forecastFor(date);
  $("forecastRows").innerHTML = Object.keys(totals)
    .filter((k) => totals[k] > 0)
    .map((k) => `<tr><td>${esc(k)}</td><td>${fmtWeight(totals[k])}</td></tr>`).join("");

  const list = orders.filter((o) => o.date === date);
  const sum = (f) => list.filter(f).reduce((t, o) => t + o.total, 0);
  const paid = sum((o) => o.payment && o.payment.status === "Paid"), owed = sum((o) => o.payment && o.payment.status !== "Paid");
  $("forecastSummary").textContent = `${list.length} cakes · ${totalKg} kg total cake for ${prettyDate(date)} · Collected ${fmt(paid)} · Due at handover ${fmt(owed)}`;

  $("orderRows").innerHTML = list.map((o) => {
    const fl = byId(FLAVORS, o.cfg.flavor);
    return `<tr><td>${esc(o.id)}</td><td>${esc(o.customer)}</td>
      <td>${kg(o.cfg.weight)} kg ${esc(fl.name)}</td><td>${esc(o.slot)}</td>
      <td>${o.payment ? esc(o.payment.label) + " · " + (o.payment.status === "Paid" ? "Paid" : "Due") : "—"}</td><td>${fmt(o.total)}</td></tr>`;
  }).join("");
}

/* ---------- INIT & EVENTS ---------- */
function init() {
  fillSelect($("flavor"), FLAVORS, true);
  fillSelect($("shape"), SHAPES, true);
  fillSelect($("frosting"), FROSTINGS, true);
  $("flavor").value = "bf";

  const dateEl = $("date");
  dateEl.min = addDays(isoToday(), 1);

  renderChips();
  renderPrice();
  renderBaker();

  ["weight", "flavor", "shape", "frosting", "fondant", "message"].forEach((id) =>
    $(id).addEventListener("input", renderPrice));
  dateEl.addEventListener("input", () => { renderCapacityBox(); renderPrice(); });

  $("festivalChips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    dateEl.value = b.dataset.date;
    renderCapacityBox();
    renderPrice();
  });

  $("bank").innerHTML += BANKS.map((b) => `<option>${esc(b)}</option>`).join("");
  document.querySelectorAll('input[name="pay"]').forEach((r) => r.addEventListener("change", showPayFields));
  document.querySelectorAll(".view-toggle button").forEach((b) => b.addEventListener("click", () => setCakeView(b.dataset.view)));
  $("cardNo").addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim(); });
  $("cardExp").addEventListener("input", (e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 4); e.target.value = v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v; });
  $("orderBtn").addEventListener("click", placeOrder);
  $("forecastDate").addEventListener("change", renderForecast);

  $("resetBtn").addEventListener("click", () => {
    orders = seedOrders();
    saveOrders(orders);
    $("receipt").classList.add("hidden");
    renderBaker();
    renderCapacityBox();
  });

  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === t));
      document.querySelectorAll(".view").forEach((v) => v.classList.toggle("hidden", v.id !== t.dataset.view));
      if (t.dataset.view === "baker") renderBaker();
    }));
}

init();