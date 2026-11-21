"use strict";
/* ---------- CUSTOMER UI ---------- */
function fillSelect(el, items, withFee) {
  el.innerHTML = items.map((i) =>
    `<option value="${i.id}">${esc(i.name)}${withFee && i.fee ? ` (+${fmt(i.fee)})` : ""}${i.pct && i.pct > 100 ? ` (+${i.pct - 100}%)` : ""}</option>`
  ).join("");
}

function currentCfg() {
  return {
    weight: Number($("weight").value),
    flavor: $("flavor").value,
    shape: $("shape").value,
    frosting: $("frosting").value,
    fondant: $("fondant").checked,
    message: $("message").value.trim()
  };
}

function renderPrice() {
  const cfg = currentCfg();
  const date = $("date").value;
  const p = calcPrice(cfg, date);
  const flavor = byId(FLAVORS, cfg.flavor);
  const frosting = byId(FROSTINGS, cfg.frosting);
  const shape = byId(SHAPES, cfg.shape);

  $("weightLabel").textContent = kg(cfg.weight) + " kg";

  const rows = [
    [`Base (${kg(cfg.weight)} kg × ${fmt(BASE_PRICE_PER_KG)}/kg)`, p.base],
    [`${flavor.name} flavor add-on`, p.flavorAddon],
    [`${frosting.name} frosting`, p.frostingFee],
    [`${shape.name} shape`, p.shapeFee],
    ["Fondant decorations", p.fondant]
  ].filter((r) => r[1] > 0 || r[0].startsWith("Base"));

  let html = rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${fmt(r[1])}</td></tr>`).join("");
  if (p.discount) html += `<tr class="discount"><td>${esc(p.discountLabel)}</td><td>−${fmt(p.discount)}</td></tr>`;
  html += `<tr class="total"><td>Total</td><td>${fmt(p.total)}</td></tr>`;
  $("priceRows").innerHTML = html;

  renderCake(cfg);
  updatePayBtn(p.total);
}

function renderCake(cfg) {
  const flavor = byId(FLAVORS, cfg.flavor);
  const frosting = byId(FROSTINGS, cfg.frosting);
  const tiers = cfg.weight >= 4500 ? 3 : cfg.weight >= 3000 ? 2 : 1;
  const widths = [210, 160, 115];
  let html = cfg.fondant ? '<div class="topper">🌸</div>' : "";
  html += `<div class="cake-msg">${esc(cfg.message || "")}</div>`;
  for (let i = tiers - 1; i >= 0; i--) {
    html += `<div class="tier ${cfg.shape}" style="width:${widths[i]}px;--frost:${frosting.color};--sponge:${flavor.sponge}"></div>`;
  }
  $("cake").innerHTML = html;
  $("cakeTop").innerHTML = topViewSVG(cfg);
  $("cakeCaption").textContent = `${tiers}-tier ${flavor.name} with ${frosting.name}`;
}

