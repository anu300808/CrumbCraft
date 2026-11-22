"use strict";
const fs = require("fs");
const path = require("path");
const log = require("./logger");
const L = require("../shared/logic");
const { hashPw } = require("./auth");

const FILE = process.env.DB_FILE || path.join(__dirname, "data", "db.json");
let db = null;

const freshDb = () => ({
  users: [{ name: "Head Baker", email: "baker@crumbcraft.demo", phone: "", role: "baker", hash: hashPw("baker123") }],
  orders: L.seedOrders()
});

function save() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE + ".tmp", JSON.stringify(db, null, 2));
    fs.renameSync(FILE + ".tmp", FILE); // atomic swap, so a crash never leaves half a file
  } catch (e) {
    log.error("Could not save the database:", e);
  }
}

function load() {
  if (db) return db;
  try {
    db = JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") log.error("Database unreadable, starting with fresh demo data:", e);
    db = freshDb();
    save();
  }
  return db;
}

module.exports = {
  orders: () => load().orders,
  findUser: (email) => load().users.find((u) => u.email === email),
  addUser(u) { load().users.push(u); save(); return u; },
  addOrder(o) { load().orders.push(o); save(); return o; },
  capacityMap() {
    const m = {};
    load().orders.forEach((o) => { m[o.date] = (m[o.date] || 0) + 1; });
    return m;
  },
  setStatus(id, status) {
    const o = load().orders.find((x) => x.id === id);
    if (!o) return null;
    o.status = status; o.statusAt = new Date().toISOString();
    save();
    return o;
  },
  resetOrders() { load().orders = L.seedOrders(); save(); }
};
