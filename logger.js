"use strict";
const line = (level, args) => {
  const text = args.map((a) => (a instanceof Error ? a.stack || a.message : typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  (level === "error" ? console.error : console.log)(`${new Date().toISOString()} [${level}] ${text}`);
};
module.exports = {
  info: (...a) => line("info", a),
  warn: (...a) => line("warn", a),
  error: (...a) => line("error", a)
};
