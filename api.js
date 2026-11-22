"use strict";
/* Talks to the Express API. All data and rules that matter live on the server. */
const TOKEN_KEY = "crumbcraft_token";
let orders = [], capacityMap = {}, authToken = null;

const log = {
  warn: (...a) => console.warn("[CrumbCraft]", ...a),
  error: (...a) => console.error("[CrumbCraft]", ...a)
};
function showAlert(msg) { const el = $("storageWarn"); el.textContent = msg; el.classList.remove("hidden"); }
function hideAlert() { $("storageWarn").classList.add("hidden"); }

function loadToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (e) { log.warn("Login cannot be remembered, storage is blocked:", e.message); return null; }
}
function saveToken(t) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }
  catch (e) { log.warn("Login cannot be remembered, storage is blocked:", e.message); }
}

async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = "Bearer " + authToken;
  let res;
  try {
    res = await fetch("/api" + path, { method: opts.method || "GET", headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  } catch (e) {
    log.error("Network error calling", path, e);
    showAlert("Cannot reach the CrumbCraft server. Start it with: npm start");
    throw new Error("Cannot reach the server.");
  }
  hideAlert();
  const data = await res.json().catch((e) => { log.warn("Non-JSON response from", path, e.message); return {}; });
  if (!res.ok) { const err = new Error(data.error || "Request failed."); err.status = res.status; throw err; }
  return data;
}

const bookedOn = (date) => capacityMap[date] || 0;
const capacityInfo = (date) => CrumbLogic.capacityInfo(bookedOn(date));

async function refreshData() {
  try { capacityMap = await api("/capacity"); } catch (e) { log.warn("Capacity refresh failed:", e.message); }
  if (!authToken) { orders = []; return; }
  try { orders = await api("/orders"); }
  catch (e) {
    log.warn("Order refresh failed:", e.message);
    if (e.status === 401) { authToken = null; sessionUser = null; saveToken(null); orders = []; }
  }
}
