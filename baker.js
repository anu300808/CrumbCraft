"use strict";
/* ---------- BAKER DASHBOARD ---------- */
function fmtWeight(g) {
  return g >= 1000 ? (g / 1000).toFixed(2).replace(/\.?0+$/, "") + " kg" : Math.round(g) + " g";
}

function renderBaker() {
  const dates = [...new Set([...FESTIVALS.map((f) => f.date), ...orders.map((o) => o.date)])].sort();

  // capacity list
  $("capacityList").innerHTML = dates.map((d) => {
    const c = capacityInfo(d);
    const f = festivalOn(d);
    const cls = c.full ? "full" : c.pct >= 80 ? "warn" : "";
    return `<div class="cap-row">
      <div class="head"><span>${prettyDate(d)}${f ? " · " + esc(f.label) : ""}</span><b>${c.booked}/${CAPACITY}</b></div>
      <div class="bar"><span class="${cls}" style="width:${c.pct}%"></span></div>
      ${c.full ? '<small style="color:var(--full)">100% capacity – new orders blocked</small>' : ""}
    </div>`;
  }).join("") || '<p class="muted">No orders yet.</p>';

  // date selector (keep selection)
  const sel = $("forecastDate");
  const prev = sel.value;
  sel.innerHTML = dates.map((d) => `<option value="${d}">${prettyDate(d)}</option>`).join("");
  if (dates.includes(prev)) sel.value = prev;
  else if (dates.includes("2026-12-24")) sel.value = "2026-12-24";

  renderForecast();
}

function renderForecast() {
  const date = $("forecastDate").value;
  if (!date) { $("forecastRows").innerHTML = ""; $("orderCards").innerHTML = ""; $("forecastSummary").textContent = ""; return; }
  const { totals, totalKg } = forecastFor(orders, date);
  $("forecastRows").innerHTML = Object.keys(totals)
    .filter((k) => totals[k] > 0)
    .map((k) => `<tr><td>${esc(k)}</td><td>${fmtWeight(totals[k])}</td></tr>`).join("");

  const list = orders.filter((o) => o.date === date);
  const sum = (f) => list.filter(f).reduce((t, o) => t + o.total, 0);
  const paid = sum((o) => o.payment && o.payment.status === "Paid"), owed = sum((o) => o.payment && o.payment.status !== "Paid");
  $("forecastSummary").textContent = `${list.length} cakes · ${totalKg} kg total cake for ${prettyDate(date)} · Collected ${fmt(paid)} · Due at handover ${fmt(owed)}`;

  $("orderCards").innerHTML = list.map(orderCard).join("") || '<p class="muted">No orders for this date.</p>';
}

function orderCard(o) {
  const st = o.status || "Received", fl = byId(FLAVORS, o.cfg.flavor), fr = byId(FROSTINGS, o.cfg.frosting), sh = byId(SHAPES, o.cfg.shape);
  const ing = forecastFor([o], o.date).totals;
  const pay = o.payment ? esc(o.payment.label) + " · " + (o.payment.status === "Paid" ? "Paid" : "Collect " + fmt(o.total)) : "—";
  return `<article class="oc s-${st.replace(" ", "")}">
    <div class="oc-head"><b>${esc(o.id)}</b><span class="st-badge">${st}</span></div>
    <p><b>${esc(o.customer)}</b> · ${esc(o.phone)} · ${esc(o.mode)} · ${esc(o.slot)}</p>
    <p>${kg(o.cfg.weight)} kg ${esc(fl.name)}, ${esc(sh.name)}, ${esc(fr.name)}${o.cfg.fondant ? " + fondant" : ""}</p>
    <p>Message: <i>"${esc(o.cfg.message)}"</i> · Payment: ${pay}</p>
    <ul class="ing">${Object.keys(ing).filter((k) => ing[k] > 0).map((k) => `<li>${esc(k)} <b>${fmtWeight(ing[k])}</b></li>`).join("")}</ul>
    <div class="steps">${CrumbLogic.STATUSES.map((x) => `<button type="button" class="${x === st ? "on" : ""}" data-id="${esc(o.id)}" data-st="${x}">${x}</button>`).join("")}</div>
  </article>`;
}

async function setOrderStatus(e) {
  const b = e.target.closest("button[data-st]");
  if (!b || b.classList.contains("on")) return;
  try {
    await api("/orders/" + encodeURIComponent(b.dataset.id) + "/status", { method: "PATCH", body: { status: b.dataset.st } });
    await refreshData();
    renderBaker();
  } catch (err) { log.error("Status update failed:", err); showAlert(err.message); }
}
