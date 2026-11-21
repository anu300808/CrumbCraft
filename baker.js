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
  if (!date) { $("forecastRows").innerHTML = ""; $("orderRows").innerHTML = ""; $("forecastSummary").textContent = ""; return; }
  const { totals, totalKg } = forecastFor(orders, date);
  $("forecastRows").innerHTML = Object.keys(totals)
    .filter((k) => totals[k] > 0)
    .map((k) => `<tr><td>${esc(k)}</td><td>${fmtWeight(totals[k])}</td></tr>`).join("");

  const list = orders.filter((o) => o.date === date);
  const sum = (f) => list.filter(f).reduce((t, o) => t + o.total, 0);
  const paid = sum((o) => o.payment && o.payment.status === "Paid"), owed = sum((o) => o.payment && o.payment.status !== "Paid");
  $("forecastSummary").textContent = `${list.length} cakes · ${totalKg} kg total cake for ${prettyDate(date)} · Collected ${fmt(paid)} · Due at handover ${fmt(owed)}`;

  $("orderRows").innerHTML = list.map((o) => {
    const fl = byId(FLAVORS, o.cfg.flavor);
    return `<tr><td>${esc(o.id)}</td><td>${esc(o.customer)}</td>
      <td>${kg(o.cfg.weight)} kg ${esc(fl.name)}</td><td>${esc(o.slot)}</td>
      <td>${o.payment ? esc(o.payment.label) + " · " + (o.payment.status === "Paid" ? "Paid" : "Due") : "—"}</td><td>${fmt(o.total)}</td></tr>`;
  }).join("");
}

