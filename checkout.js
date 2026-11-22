"use strict";
/* ---------- PAYMENT ---------- */
const BANKS = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", "Punjab National Bank"];
const PAY_LABEL = { upi: "UPI", card: "Card", net: "Net banking", cash: "Cash" };
let lastTotal = 0;
const payMethod = () => document.querySelector('input[name="pay"]:checked').value;
const luhn = (n) => { let s = 0, dbl = false; for (let i = n.length - 1; i >= 0; i--) { let x = +n[i]; if (dbl) { x *= 2; if (x > 9) x -= 9; } s += x; dbl = !dbl; } return s % 10 === 0; };
const cardBrand = (n) => /^4/.test(n) ? "Visa" : /^(5[1-5]|2[2-7])/.test(n) ? "Mastercard" : /^3[47]/.test(n) ? "Amex" : /^(60|65|81|82|508)/.test(n) ? "RuPay" : "Card";
function updatePayBtn(total) {
  lastTotal = total;
  $("orderBtn").textContent = payMethod() === "cash" ? "Confirm pre-order (pay at handover)" : "Pay " + fmt(total) + " & confirm";
}
function showPayFields() {
  document.querySelectorAll(".pay-fields").forEach((f) => f.classList.toggle("hidden", f.dataset.for !== payMethod()));
  updatePayBtn(lastTotal);
}
// Returns [errorMessage | null, maskedDetail]. Full card number and CVV are never stored.
function checkPayment() {
  const m = payMethod();
  if (m === "upi") {
    const v = $("upiId").value.trim();
    if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(v)) return ["Enter a valid UPI ID, like name@bank.", ""];
    return [null, "UPI · " + v.slice(0, 2) + "***" + v.slice(v.indexOf("@"))];
  }
  if (m === "card") {
    const n = $("cardNo").value.replace(/\s/g, ""), em = $("cardExp").value.match(/^(0[1-9]|1[0-2])\/(\d{2})$/), now = new Date();
    if (!/^\d{13,19}$/.test(n) || !luhn(n)) return ["Enter a valid card number.", ""];
    if (!em) return ["Enter the card expiry as MM/YY.", ""];
    const yr = 2000 + +em[2];
    if (yr < now.getFullYear() || (yr === now.getFullYear() && +em[1] < now.getMonth() + 1)) return ["This card has expired.", ""];
    if (!/^\d{3,4}$/.test($("cardCvv").value.trim())) return ["Enter the 3 or 4 digit CVV.", ""];
    if ($("cardName").value.trim().length < 2) return ["Enter the name on the card.", ""];
    return [null, cardBrand(n) + " •••• " + n.slice(-4)];
  }
  if (m === "net") return $("bank").value ? [null, $("bank").value] : ["Choose your bank.", ""];
  return [null, "Cash at " + $("mode").value.toLowerCase()];
}

function renderCapacityBox() {
  const date = $("date").value;
  const box = $("capacityBox");
  if (!date) { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  const c = capacityInfo(date);
  const fill = $("capacityFill");
  fill.style.width = c.pct + "%";
  fill.className = c.full ? "full" : c.pct >= 80 ? "warn" : "";
  $("capacityText").textContent = c.full
    ? `${prettyDate(date)}: 100% booked – fully booked, please pick another date`
    : `${prettyDate(date)}: ${c.pct}% booked${c.left <= 5 ? ` – only ${c.left} slot${c.left === 1 ? "" : "s"} left!` : ` – ${c.left} slots available`}`;
}

function renderChips() {
  $("festivalChips").innerHTML = FESTIVALS
    .filter((f) => daysUntil(f.date) >= 1)
    .map((f) => `<button type="button" class="chip" data-date="${f.date}">${esc(f.label)}</button>`)
    .join("");
}

function validate() {
  const cfg = currentCfg();
  const date = $("date").value;
  const name = $("name").value.trim();
  const phone = $("phone").value.trim();
  if (!name) return "Please enter your name.";
  if (!/^[6-9]\d{9}$/.test(phone)) return "Enter a valid 10-digit mobile number.";
  if (!date) return "Please choose a delivery / pickup date.";
  if (daysUntil(date) < 1) return "Pre-orders must be for tomorrow or later.";
  if (capacityInfo(date).full) return "That date is fully booked. Please pick another date.";
  if (!cfg.message) return "Add a message for the cake (or write 'No message').";
  return checkPayment()[0] || "";
}

async function placeOrder() {
  const err = validate();
  $("formError").textContent = err;
  if (err) return;

  const cfg = currentCfg(), date = $("date").value, method = payMethod(), detail = checkPayment()[1];
  const btn = $("orderBtn");
  btn.disabled = true;
  btn.textContent = method === "cash" ? "Reserving your slot…" : "Processing payment…";
  try {
    await new Promise((r) => setTimeout(r, method === "cash" ? 300 : 1200)); // demo payment delay
    const order = await api("/orders", {
      method: "POST",
      body: { customer: $("name").value.trim(), phone: $("phone").value.trim(), mode: $("mode").value, date, slot: $("slot").value, cfg, payment: { method, detail } }
    });
    ["cardNo", "cardExp", "cardCvv"].forEach((id) => ($(id).value = ""));
    await refreshData();
    renderReceipt(order);
    renderCapacityBox();
    renderBaker();
    renderMyOrders();
  } catch (e) {
    log.error("Order failed:", e);
    $("formError").textContent = e.status === 409 ? "That date just filled up. Please pick another date." : e.message;
    await refreshData();
    renderCapacityBox();
  } finally {
    btn.disabled = false;
    updatePayBtn(lastTotal);
  }
}

function renderReceipt(o) {
  const flavor = byId(FLAVORS, o.cfg.flavor);
  const frosting = byId(FROSTINGS, o.cfg.frosting);
  const shape = byId(SHAPES, o.cfg.shape);
  const p = o.pricing || calcPrice(o.cfg, o.date);
  const pay = o.payment || { detail: "Not recorded", status: "" };
  const due = pay.status === "Due at handover";
  const el = $("receipt");
  el.classList.remove("hidden");
  el.innerHTML = `
    <h2>Digital Receipt</h2>
    <p class="center"><span class="status">✔ Order Confirmed</span></p>
    <div class="receipt-cake">${topViewSVG(o.cfg)}</div>
    <dl>
      <dt>Order ID</dt><dd>${esc(o.id)}</dd>
      <dt>Customer</dt><dd>${esc(o.customer)} (${esc(o.phone)})</dd>
      <dt>${esc(o.mode)} date</dt><dd>${prettyDate(o.date)}</dd>
      <dt>Time slot</dt><dd>${esc(o.slot)}</dd>
      <dt>Cake</dt><dd>${kg(o.cfg.weight)} kg ${esc(flavor.name)}, ${esc(shape.name)}</dd>
      <dt>Frosting</dt><dd>${esc(frosting.name)}${o.cfg.fondant ? " + fondant decorations" : ""}</dd>
      <dt>Message</dt><dd>"${esc(o.cfg.message)}"</dd>
      <dt>Payment</dt><dd>${esc(pay.detail)}</dd>
      <dt>Payment status</dt><dd>${pay.status ? (due ? "Due at handover" : "Paid ✔") : "—"}${pay.txn ? " · " + esc(pay.txn) : ""}</dd>
    </dl>
    <table class="price"><tbody>
      <tr><td>Base price</td><td>${fmt(p.base)}</td></tr>
      ${p.flavorAddon ? `<tr><td>Flavor add-on</td><td>${fmt(p.flavorAddon)}</td></tr>` : ""}
      ${p.frostingFee ? `<tr><td>Frosting</td><td>${fmt(p.frostingFee)}</td></tr>` : ""}
      ${p.shapeFee ? `<tr><td>Shape</td><td>${fmt(p.shapeFee)}</td></tr>` : ""}
      ${p.fondant ? `<tr><td>Fondant decorations</td><td>${fmt(p.fondant)}</td></tr>` : ""}
      ${p.discount ? `<tr class="discount"><td>${esc(p.discountLabel)}</td><td>−${fmt(p.discount)}</td></tr>` : ""}
      <tr class="total"><td>${due ? "Total due" : "Total paid"}</td><td>${fmt(o.total)}</td></tr>
    </tbody></table>
    <button class="ghost" data-print>Print receipt</button>`;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

