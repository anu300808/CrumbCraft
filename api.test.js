"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), os = require("os"), path = require("path");

let hasExpress = true;
try { require.resolve("express"); } catch (e) { hasExpress = false; }

test("API: auth, pricing, capacity and roles", { skip: !hasExpress && "run npm install first" }, async (t) => {
  process.env.DB_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cc-")), "db.json");
  const app = require("../server/server"), L = require("../shared/logic");
  const server = app.listen(0);
  t.after(() => server.close());
  const base = "http://127.0.0.1:" + server.address().port + "/api";
  const call = async (p, method = "GET", body, token) => {
    const r = await fetch(base + p, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body && JSON.stringify(body) });
    return { status: r.status, data: await r.json() };
  };
  const date = L.addDays(L.isoToday(), 30);
  const order = (extra = {}) => ({ customer: "Rahul", phone: "9876543210", mode: "Pickup", date, slot: L.SLOTS[0], cfg: { weight: 1000, flavor: "van", shape: "round", frosting: "bc", fondant: false, message: "Hi" }, payment: { method: "cash" }, ...extra });

  const baker = await call("/auth/login", "POST", { email: "baker@crumbcraft.demo", password: "baker123" });
  assert.equal(baker.status, 200);
  assert.equal((await call("/auth/login", "POST", { email: "baker@crumbcraft.demo", password: "wrong" })).status, 401);

  const cust = await call("/auth/signup", "POST", { name: "Asha Rao", email: "asha@example.com", phone: "9123456780", password: "secret1" });
  assert.equal(cust.status, 201);
  assert.equal((await call("/auth/signup", "POST", { name: "Asha Rao", email: "asha@example.com", phone: "9123456780", password: "secret1" })).status, 409);

  assert.equal((await call("/orders", "GET", null, baker.data.token)).data.length, 15);
  assert.equal((await call("/reset", "POST", null, cust.data.token)).status, 403);
  assert.equal((await call("/orders", "POST", order({ phone: "123" }))).status, 400);

  const first = await call("/orders", "POST", order({ total: 1 }), cust.data.token); // client "total" must be ignored
  assert.equal(first.status, 201);
  assert.equal(first.data.total, L.calcPrice(order().cfg, date).total);
  assert.equal((await call("/orders", "GET", null, cust.data.token)).data.length, 1);

  for (let i = 1; i < L.CAPACITY; i++) assert.equal((await call("/orders", "POST", order())).status, 201);
  assert.equal((await call("/orders", "POST", order())).status, 409); // 26th cake is refused
});
