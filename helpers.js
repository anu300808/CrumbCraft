"use strict";
const { CAPACITY, BASE_PRICE_PER_KG, FLAVORS, FROSTINGS, SHAPES, FESTIVALS, calcPrice, forecastFor,
  localIso, isoToday, addDays, daysUntil, festivalOn } = CrumbLogic;

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
const prettyDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

