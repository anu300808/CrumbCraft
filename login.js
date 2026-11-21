"use strict";
/* Login / sign-up UI. The server owns accounts, passwords and sessions. */
let sessionUser = null, authMode = "login";

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

async function submitAuth(e) {
  e.preventDefault();
  const err = $("authError");
  err.textContent = "";
  const body = { email: $("authEmail").value.trim(), password: $("authPw").value };
  if (authMode === "signup") { body.name = $("authName").value.trim(); body.phone = $("authPhone").value.trim(); }
  try {
    await startSession(await api("/auth/" + authMode, { method: "POST", body }));
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
  renderBaker();
}

function applyAuth() {
  const u = sessionUser, isBaker = !!u && u.role === "baker";
  $("loginBtn").classList.toggle("hidden", !!u);
  $("userBox").classList.toggle("hidden", !u);
  if (u) { $("userName").textContent = u.name; $("userRole").textContent = isBaker ? "Baker" : "Customer"; }
  $("bakerTab").classList.toggle("hidden", !isBaker);
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
    return `<div class="my-order"><div><b>${esc(o.id)}</b><br>
      <small class="muted">${prettyDate(o.date)} · ${kg(o.cfg.weight)} kg ${esc(fl ? fl.name : "cake")} · ${fmt(o.total)}</small></div>
      <button type="button" class="ghost" data-id="${esc(o.id)}">View receipt</button></div>`;
  }).join("") : '<p class="muted">No orders yet. Your confirmed pre-orders will show up here.</p>';
}

function initAuthEvents() {
  $("loginBtn").addEventListener("click", () => { setAuthMode("login"); $("authDlg").showModal(); });
  $("logoutBtn").addEventListener("click", logout);
  $("authForm").addEventListener("submit", submitAuth);
  $("authCancel").addEventListener("click", () => $("authDlg").close());
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
