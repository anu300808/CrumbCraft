"use strict";
const crypto = require("crypto");
const log = require("./logger");

const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const TTL_MS = 7 * 864e5;

const hashPw = (pw, salt = crypto.randomBytes(16).toString("hex")) =>
  salt + ":" + crypto.scryptSync(pw, salt, 64).toString("hex");

function checkPw(pw, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex"), b = Buffer.from(hashPw(pw, salt).split(":")[1], "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const sign = (payload) => crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");

function makeToken(user) {
  const payload = Buffer.from(JSON.stringify({ email: user.email, exp: Date.now() + TTL_MS })).toString("base64url");
  return payload + "." + sign(payload);
}

function readToken(token) {
  const [payload, sig] = String(token || "").split(".");
  if (!payload || !sig) return null;
  const good = sign(payload);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.exp > Date.now() ? data : null;
  } catch (e) {
    log.warn("Token payload could not be parsed:", e.message);
    return null;
  }
}

module.exports = { hashPw, checkPw, makeToken, readToken };
