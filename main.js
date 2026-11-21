"use strict";
/* ---------- INIT & EVENTS ---------- */
function init() {
  fillSelect($("flavor"), FLAVORS, true);
  fillSelect($("shape"), SHAPES, true);
  fillSelect($("frosting"), FROSTINGS, true);
  $("flavor").value = "bf";

  const dateEl = $("date");
  dateEl.min = addDays(isoToday(), 1);

  renderChips();
  renderPrice();
  renderBaker();

  ["weight", "flavor", "shape", "frosting", "fondant", "message"].forEach((id) =>
    $(id).addEventListener("input", renderPrice));
  dateEl.addEventListener("input", () => { renderCapacityBox(); renderPrice(); });

  $("festivalChips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    dateEl.value = b.dataset.date;
    renderCapacityBox();
    renderPrice();
  });

  $("bank").innerHTML += BANKS.map((b) => `<option>${esc(b)}</option>`).join("");
  document.querySelectorAll('input[name="pay"]').forEach((r) => r.addEventListener("change", showPayFields));
  document.querySelectorAll(".view-toggle button").forEach((b) => b.addEventListener("click", () => setCakeView(b.dataset.view)));
  $("cardNo").addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim(); });
  $("cardExp").addEventListener("input", (e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 4); e.target.value = v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v; });
  $("orderBtn").addEventListener("click", placeOrder);
  $("forecastDate").addEventListener("change", renderForecast);

  $("resetBtn").addEventListener("click", async () => {
    if (!confirm("Reset all orders to the demo data?")) return;
    try {
      await api("/reset", { method: "POST" });
      $("receipt").classList.add("hidden");
      await refreshData();
      renderBaker();
      renderCapacityBox();
    } catch (e) { log.error("Reset failed:", e); $("formError").textContent = e.message; }
  });
  $("receipt").addEventListener("click", (e) => { if (e.target.closest("[data-print]")) window.print(); });

  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      if (!t.dataset.view) return;
      if (t.dataset.view === "baker" && !(sessionUser && sessionUser.role === "baker")) return;
      document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === t));
      document.querySelectorAll(".view").forEach((v) => v.classList.toggle("hidden", v.id !== t.dataset.view));
      if (t.dataset.view === "baker") refreshData().then(renderBaker);
    }));
}


async function boot() {
  initAuthEvents();
  authToken = loadToken();
  if (authToken) {
    try { sessionUser = (await api("/me")).user; }
    catch (e) { log.warn("Saved login is no longer valid:", e.message); authToken = null; saveToken(null); }
  }
  await refreshData();
  applyAuth();
  renderBaker();
  renderCapacityBox();
}

init();
boot();
