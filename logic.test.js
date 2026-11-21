"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../shared/logic");

const cfg = (o = {}) => ({ weight: 2500, flavor: "bf", shape: "round", frosting: "bc", fondant: false, message: "Happy Birthday Rahul", ...o });

test("2.5 kg Black Forest is Rs 1,650 with no discount", () => {
  assert.equal(L.calcPrice(cfg(), "2026-12-24", "2026-12-22").total, 165000);
});
test("early-bird gives 10% off festival dates booked 7+ days ahead", () => {
  const p = L.calcPrice(cfg(), "2026-12-24", "2026-11-20");
  assert.equal(p.discount, 16500);
  assert.equal(p.total, 148500);
});
test("no early-bird on non-festival dates", () => {
  assert.equal(L.calcPrice(cfg(), "2026-12-10", "2026-11-20").discount, 0);
});
test("add-ons combine in integer paise", () => {
  const p = L.calcPrice(cfg({ weight: 1000, flavor: "mango", frosting: "gan", shape: "heart", fondant: true }), "2026-12-10", "2026-11-20");
  assert.equal(p.subtotal, 60000 + 15000 + 15000 + 10000 + 25000);
  assert.ok(Number.isInteger(p.total));
});
test("BOM forecast: 2.5 kg Black Forest needs 750 g cream and 300 g dark chocolate", () => {
  const f = L.forecastFor([{ date: "2026-12-24", cfg: cfg() }], "2026-12-24");
  assert.equal(f.totals["Whipping Cream"], 750);
  assert.equal(f.totals["Dark Chocolate"], 300);
  assert.equal(f.totalKg, 2.5);
});
test("forecast ignores other dates and grows with each order", () => {
  const o = (date) => ({ date, cfg: cfg({ weight: 1000 }) });
  assert.equal(L.forecastFor([o("2026-12-24"), o("2026-12-24"), o("2026-12-25")], "2026-12-24").totals["Whipping Cream"], 600);
});
test("capacity blocks at 25 cakes", () => {
  assert.equal(L.capacityInfo(22).left, 3);
  assert.equal(L.capacityInfo(25).full, true);
  assert.equal(L.capacityInfo(25).pct, 100);
});
test("seed data: 15 orders, 9 on Dec 24", () => {
  const s = L.seedOrders();
  assert.equal(s.length, 15);
  assert.equal(s.filter((o) => o.date === "2026-12-24").length, 9);
});

const good = () => ({ customer: "Rahul", phone: "9876543210", mode: "Pickup", date: "2026-12-24", slot: L.SLOTS[0], cfg: cfg(), payment: { method: "cash" } });
test("validateOrder accepts a good order", () => assert.equal(L.validateOrder(good(), "2026-11-20"), null));
test("validateOrder rejects bad input", () => {
  const bad = (patch) => L.validateOrder({ ...good(), ...patch }, "2026-11-20");
  assert.match(bad({ phone: "1234567890" }), /mobile/);
  assert.match(bad({ date: "2026-11-20" }), /tomorrow/);
  assert.match(bad({ date: "2026-13-45" }), /tomorrow/);
  assert.match(bad({ slot: "midnight" }), /slot/);
  assert.match(bad({ cfg: cfg({ weight: 7000 }) }), /weight/);
  assert.match(bad({ cfg: cfg({ flavor: "nope" }) }), /flavor/);
  assert.match(bad({ cfg: cfg({ message: "x".repeat(41) }) }), /message/);
  assert.match(bad({ payment: { method: "bitcoin" } }), /payment/);
});
