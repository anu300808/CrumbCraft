"use strict";
/* Business rules shared by the browser and the server: pricing, BOM forecast, capacity, validation. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CrumbLogic = factory();
})(this, function () {
  /* ---------- DATA ---------- */
  const CAPACITY = 25;
  const BASE_PRICE_PER_KG = 60000;   // paise (₹600/kg)
  const FONDANT_FEE = 25000;         // paise
  const EARLY_BIRD_PCT = 10;

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

  const localIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const isoToday = () => localIso(new Date());
  const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return localIso(d); };
  const daysUntil = (iso, today = isoToday()) => Math.round((new Date(iso + "T00:00:00") - new Date(today + "T00:00:00")) / 864e5);
  const festivalOn = (iso) => FESTIVALS.find((f) => f.date === iso);
  /* ---------- PRICE ENGINE (integer paise) ---------- */
  function calcPrice(cfg, date, today = isoToday()) {
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
    if (fest && daysUntil(date, today) >= 7) {
      discount = Math.round((subtotal * EARLY_BIRD_PCT) / 100);
      discountLabel = `Early-bird ${EARLY_BIRD_PCT}% (${fest.label})`;
    }
    return { base, flavorAddon, frostingFee, shapeFee, fondant, subtotal, discount, discountLabel, total: subtotal - discount };
  }


  const SLOTS = ["10:00 AM – 12:00 PM", "12:00 PM – 02:00 PM", "02:00 PM – 04:00 PM", "04:00 PM – 06:00 PM"];
  const PAY_METHODS = ["upi", "card", "net", "cash"];
  const STATUSES = ["Received", "In making", "Ready", "Completed"];
  const byId = (arr, id) => arr.find((x) => x.id === id);

  const capacityInfo = (booked) => {
    const left = CAPACITY - booked;
    return { booked, left, full: left <= 0, pct: Math.min(100, Math.round((booked / CAPACITY) * 100)) };
  };

  // Bill-of-Materials explosion: total grams = sum(weight_kg * grams_per_kg), flavor recipes override the base recipe.
  function forecastFor(orders, date) {
    const totals = {};
    let totalKg = 0;
    orders.filter((o) => o.date === date).forEach((o) => {
      const w = o.cfg.weight / 1000, bom = { ...BASE_BOM, ...byId(FLAVORS, o.cfg.flavor).bom };
      totalKg += w;
      for (const ing in bom) totals[ing] = (totals[ing] || 0) + w * bom[ing];
    });
    return { totals, totalKg };
  }

  // Returns an error message, or null when the order is acceptable.
  function validateOrder(o, today = isoToday()) {
    if (!o || typeof o !== "object") return "Invalid order.";
    const c = o.cfg || {};
    if (typeof o.customer !== "string" || o.customer.trim().length < 2 || o.customer.length > 60) return "Enter your name.";
    if (!/^[6-9]\d{9}$/.test(String(o.phone))) return "Enter a valid 10-digit mobile number.";
    if (!["Pickup", "Delivery"].includes(o.mode)) return "Choose pickup or delivery.";
    if (!SLOTS.includes(o.slot)) return "Choose a valid time slot.";
    if (typeof o.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.date) || !(daysUntil(o.date, today) >= 1)) return "Pre-orders must be for tomorrow or later.";
    if (!Number.isInteger(c.weight) || c.weight < 500 || c.weight > 5000 || c.weight % 500) return "Cake weight must be 0.5 to 5 kg.";
    if (!byId(FLAVORS, c.flavor)) return "Choose a valid flavor.";
    if (!byId(FROSTINGS, c.frosting)) return "Choose a valid frosting.";
    if (!byId(SHAPES, c.shape)) return "Choose a valid shape.";
    if (typeof c.message !== "string" || !c.message.trim() || c.message.length > 40) return "Add a cake message of up to 40 characters.";
    if (!o.payment || !PAY_METHODS.includes(o.payment.method)) return "Choose a payment method.";
    return null;
  }

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
        pricing: p, userEmail: "", payment: SEED_PAY[i % 4]
      };
    });
  }


  return { CAPACITY, BASE_PRICE_PER_KG, FONDANT_FEE, EARLY_BIRD_PCT, BASE_BOM, FLAVORS, FROSTINGS, SHAPES, FESTIVALS, SLOTS, PAY_METHODS, STATUSES,
    localIso, isoToday, addDays, daysUntil, festivalOn, calcPrice, capacityInfo, forecastFor, validateOrder, seedOrders };
});
