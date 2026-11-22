"use strict";
/* Login / sign-up UI. The server owns accounts, passwords and sessions. */
let sessionUser = null, authMode = "login", authRole = "customer";
const STATUS_MSG = { Received: "We have your order.", "In making": "Your cake is being baked.", Ready: "Ready for pickup or delivery!", Completed: "Enjoy your cake!" };

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  document.querySelectorAll(".auth-tab").forEach((b) => b.classList.toggle("on", b.dataset.mode === mode));
  document.querySelector(".signup-only").classList.toggle("hidden", !signup);
  $("authTitle").textContent = signup ? "Create your account" : "Welcome back";
  $("authSubmit").textContent = signup ? "Create account" : "Log in";
  $("authPw").autocomplete = signup ? "new-password" : "current-password";
  $("authError").textContent = "";
}

function setAuthRole(role) {
  authRole = role;
  const baker = role === "baker";
  document.querySelector(".auth-tabs").classList.toggle("hidden", baker);
  $("demoNote").classList.toggle("hidden", !baker);
  $("authCancel").textContent = baker ? "Back" : "Continue as guest";
  setAuthMode("login");
  $("authTitle").textContent = baker ? "Baker login" : "Welcome back";
}

async function submitAuth(e) {
  e.preventDefault();
  const err = $("authError");
  err.textContent = "";
  const body = { email: $("authEmail").value.trim(), password: $("authPw").value };
  if (authMode === "signup") { body.name = $("authName").value.trim(); body.phone = $("authPhone").value.trim(); }
  try {
    const r = await api("/auth/" + authMode, { method: "POST", body });
    if (r.user.role !== authRole) throw new Error(authRole === "baker" ? "That is not a baker account. Use customer login." : "Bakers must log in from the baker login.");
    await startSession(r);
    $("authDlg").close();
    $("authForm").reset();
  } catch (e2) {
    log.warn("Auth failed:", e2.message);
    err.textContent = e2.message;
  }
}

async function startSession(r) {
  authToken = r.token;
  sessionUser = r.user;
  saveToken(r.token);
  await refreshData();
  applyAuth();
  renderBaker();
  renderCapacityBox();
  if (sessionUser.role === "baker") document.querySelector('.tab[data-view="baker"]').click();
}

function logout() {
  authToken = null; sessionUser = null; orders = [];
  saveToken(null);
  $("receipt").classList.add("hidden");
  $("name").value = ""; $("phone").value = "";
  applyAuth();
  $("gate").classList.remove("hidden");
  renderBaker();
}

function applyAuth() {
  const u = sessionUser, isBaker = !!u && u.role === "baker";
  $("loginBtn").classList.toggle("hidden", !!u);
  $("userBox").classList.toggle("hidden", !u);
  if (u) { $("userName").textContent = u.name; $("userRole").textContent = isBaker ? "Baker" : "Customer"; }
  $("bakerTab").classList.toggle("hidden", !isBaker);
  document.querySelector('.tab[data-view="customer"]').classList.toggle("hidden", isBaker); // bakers get no ordering screen
  if (u) $("gate").classList.add("hidden");
  if (isBaker && $("baker").classList.contains("hidden")) document.querySelector('.tab[data-view="baker"]').click();
  if (!isBaker && !$("baker").classList.contains("hidden")) document.querySelector('.tab[data-view="customer"]').click();
  if (u && u.role === "customer") {
    if (!$("name").value) $("name").value = u.name;
    if (!$("phone").value) $("phone").value = u.phone;
  }
  renderMyOrders();
}

function renderMyOrders() {
  const box = $("myOrders"), u = sessionUser;
  if (!u || u.role !== "customer") { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  const mine = orders.filter((o) => o.userEmail === u.email).reverse();
  $("myOrdersList").innerHTML = mine.length ? mine.map((o) => {
    const fl = byId(FLAVORS, o.cfg.flavor);
    const st = o.status || "Received", at = CrumbLogic.STATUSES.indexOf(st);
    return `<div class="my-order">${trackerSVG(st, o.cfg)}<div class="mo-info"><b>${esc(o.id)}</b><br>
      <small class="muted">${prettyDate(o.date)} · ${kg(o.cfg.weight)} kg ${esc(fl ? fl.name : "cake")} · ${fmt(o.total)}</small>
      <div class="track">${CrumbLogic.STATUSES.map((x, k) => `<span class="${k <= at ? "on" : ""}">${x}</span>`).join("")}</div>
      <small><b>${STATUS_MSG[st]}</b></small></div>
      <button type="button" class="ghost" data-id="${esc(o.id)}">View receipt</button></div>`;
  }).join("") : '<p class="muted">No orders yet. Your confirmed pre-orders will show up here.</p>';
}

function initAuthEvents() {
  $("loginBtn").addEventListener("click", () => { setAuthRole("customer"); $("authDlg").showModal(); });
  $("gateCustomer").addEventListener("click", () => $("gate").classList.add("hidden"));
  $("gateBaker").addEventListener("click", () => { $("gate").classList.add("hidden"); setAuthRole("baker"); $("authDlg").showModal(); });
  $("logoutBtn").addEventListener("click", logout);
  $("authForm").addEventListener("submit", submitAuth);
  $("authCancel").addEventListener("click", () => { $("authDlg").close(); if (authRole === "baker" && !sessionUser) $("gate").classList.remove("hidden"); });
  document.querySelectorAll(".auth-tab").forEach((b) => b.addEventListener("click", () => setAuthMode(b.dataset.mode)));
  $("demoBaker").addEventListener("click", () => {
    setAuthMode("login");
    $("authEmail").value = "baker@crumbcraft.demo";
    $("authPw").value = "baker123";
  });
  $("myOrdersList").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]");
    const o = b && orders.find((x) => x.id === b.dataset.id);
    if (o) renderReceipt(o);
  });
}
