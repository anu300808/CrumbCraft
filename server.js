"use strict";
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const L = require("../shared/logic");
const store = require("./store");
const log = require("./logger");
const { hashPw, checkPw, makeToken, readToken } = require("./auth");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'"
  });
  next();
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUser = (u) => ({ name: u.name, email: u.email, phone: u.phone, role: u.role });
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

function limit(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now(), key = req.ip;
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) return bad(res, "Too many attempts. Please wait a minute and try again.", 429);
    recent.push(now);
    hits.set(key, recent);
    next();
  };
}

function identify(req, _res, next) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  const data = m && readToken(m[1]);
  req.user = (data && store.findUser(data.email)) || null;
  next();
}
const need = (role) => (req, res, next) => {
  if (!req.user) return bad(res, "Please log in.", 401);
  if (role && req.user.role !== role) return bad(res, "Baker access only.", 403);
  next();
};
app.use("/api", identify);

/* ---- accounts ---- */
app.post("/api/auth/signup", limit(10, 60000), (req, res) => {
  const { name, phone, password } = req.body || {};
  const email = String((req.body || {}).email || "").trim().toLowerCase();
  if (typeof name !== "string" || name.trim().length < 2 || name.length > 60) return bad(res, "Enter your full name.");
  if (!EMAIL.test(email) || email.length > 120) return bad(res, "Enter a valid email address.");
  if (!/^[6-9]\d{9}$/.test(String(phone))) return bad(res, "Enter a valid 10-digit mobile number.");
  if (typeof password !== "string" || password.length < 6 || password.length > 100) return bad(res, "Use a password with at least 6 characters.");
  if (store.findUser(email)) return bad(res, "That email already has an account. Log in instead.", 409);
  const user = store.addUser({ name: name.trim(), email, phone: String(phone), role: "customer", hash: hashPw(password) });
  res.status(201).json({ token: makeToken(user), user: publicUser(user) });
});

app.post("/api/auth/login", limit(10, 60000), (req, res) => {
  const email = String((req.body || {}).email || "").trim().toLowerCase();
  const user = store.findUser(email);
  if (!user || !checkPw(String((req.body || {}).password || ""), user.hash)) return bad(res, "Incorrect email or password.", 401);
  res.json({ token: makeToken(user), user: publicUser(user) });
});

app.get("/api/me", need(), (req, res) => res.json({ user: publicUser(req.user) }));

/* ---- capacity, orders, forecast ---- */
app.get("/api/capacity", (_req, res) => res.json(store.capacityMap()));

app.get("/api/orders", (req, res) => {
  if (!req.user) return res.json([]);
  const all = store.orders();
  const mine = req.user.role === "baker" ? all : all.filter((o) => o.userEmail === req.user.email); // customers never see other people's orders
  res.json(mine.map((o) => ({ ...o, status: o.status || "Received" })));
});

app.post("/api/orders", limit(30, 60000), (req, res) => {
  const b = req.body || {};
  const err = L.validateOrder(b);
  if (err) return bad(res, err);
  const booked = store.orders().filter((o) => o.date === b.date).length; // sync + single process = no race
  if (L.capacityInfo(booked).full) return bad(res, "That date is fully booked. Please pick another date.", 409);

  const cfg = { weight: b.cfg.weight, flavor: b.cfg.flavor, shape: b.cfg.shape, frosting: b.cfg.frosting, fondant: !!b.cfg.fondant, message: b.cfg.message.trim() };
  const pricing = L.calcPrice(cfg, b.date); // the server decides the price, never the client
  const method = b.payment.method, cash = method === "cash";
  const id = () => crypto.randomBytes(4).toString("hex").toUpperCase();
  const order = store.addOrder({
    id: "CC-" + id(), customer: b.customer.trim(), phone: String(b.phone), mode: b.mode, date: b.date, slot: b.slot,
    status: "Received", cfg, total: pricing.total, pricing, placedOn: L.isoToday(), userEmail: req.user ? req.user.email : "",
    payment: {
      method, label: { upi: "UPI", card: "Card", net: "Net banking", cash: "Cash" }[method],
      detail: String(b.payment.detail || "").slice(0, 40), status: cash ? "Due at handover" : "Paid", txn: cash ? "" : "TXN" + id()
    }
  });
  log.info("Order placed", order.id, order.date);
  res.status(201).json(order);
});

app.get("/api/forecast/:date", need("baker"), (req, res) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.params.date)) return bad(res, "Date must look like 2026-12-24.");
  res.json(L.forecastFor(store.orders(), req.params.date));
});

app.patch("/api/orders/:id/status", need("baker"), (req, res) => {
  const status = (req.body || {}).status;
  if (!L.STATUSES.includes(status)) return bad(res, "Choose a valid status.");
  const o = store.setStatus(req.params.id, status);
  if (!o) return bad(res, "Order not found.", 404);
  log.info("Order status", o.id, status);
  res.json(o);
});

app.post("/api/reset", need("baker"), (_req, res) => { store.resetOrders(); res.json({ ok: true }); });

/* ---- static files, 404s, errors ---- */
app.use("/shared", express.static(path.join(__dirname, "..", "shared")));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/api", (_req, res) => bad(res, "Not found.", 404));
app.use((err, req, res, _next) => {
  log.error("Request failed:", req.method, req.path, err);
  const client = err.type === "entity.parse.failed" || err.status === 400 || err.status === 413;
  res.status(client ? 400 : 500).json({ error: client ? "Invalid request." : "Something went wrong on our side." });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => log.info(`CrumbCraft running at http://localhost:${port}`));
}
module.exports = app;
