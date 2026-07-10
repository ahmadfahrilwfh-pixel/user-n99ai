import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "./firebase.config.js";

const gw = () => window.N99Gateway;
const guard = () => window.N99RouteGuard;
const toast = () => window.N99Toast;
const AUTH_URL = window.N99_USER_AUTH_URL || window.N99_CONFIG?.LANDING_PATH || "/user";
const PLANS = window.N99_CONFIG?.PLANS || {
  STARTER: { tier: "STARTER", amount: 1000000 },
  PRO: { tier: "PRO", amount: 5000000 },
  VIP: { tier: "VIP", amount: 10000000 },
};
const POLL_MS = 15000;
const BILLING_MS = 15000;

const $ = (id) => document.getElementById(id);
let selectedPlanKey = null;
let brokerUnlocked = false;
let currentUid = "";
let currentTenantId = "";
let currentDisplayName = "";
let pollStarted = false;

function resetDashboardState() {
  paintMoney($("metricBalance"), 0);
  paintMoney($("metricEquity"), 0);
  paintMoney($("metricMargin"), 0);
  paintMoney($("metricFreeMargin"), 0);
  paintSigned($("metricFloating"), 0);
  if ($("metricWinrate")) $("metricWinrate").textContent = "-";
  if ($("metricPnlSummary")) $("metricPnlSummary").textContent = "-";
  if ($("metricTrades")) $("metricTrades").textContent = "0";
  if ($("metricSource")) $("metricSource").textContent = "tenant_scoped";
  if ($("gatewayPill")) $("gatewayPill").classList.add("is-inactive");
  if ($("gatewayPillText")) $("gatewayPillText").textContent = "STANDBY";
}

function renderUserIdentity(displayName, tenantId) {
  const name = (displayName || "User").trim();
  const tid = (tenantId || currentTenantId || "").trim();
  const label = tid ? `Welcome, ${name} | Client ID: ${tid}` : `Welcome, ${name}`;
  if ($("userWelcomeBanner")) $("userWelcomeBanner").textContent = label;
  if ($("metricUserId")) $("metricUserId").textContent = tid || name.slice(0, 12);
  if ($("portfolioHeading")) $("portfolioHeading").textContent = tid ? `Client ${tid}` : "Tenant Overview";
}

function requireAuthRedirect() {
  if (guard()?.requireAuth) return guard().requireAuth();
  if (!gw().getToken()) window.location.replace(AUTH_URL);
}

function setPageLoading(active) {
  const bar = $("pageLoadingBar");
  if (bar) bar.hidden = !active;
  const root = $("dashboardRoot");
  if (root) root.classList.toggle("is-syncing", active);
}

function setButtonLoading(button, loading, loadingText) {
  if (!button) return;
  const label = button.querySelector(".btn-label");
  const spinner = button.querySelector(".btn-spinner");
  if (loading) {
    button.dataset.prevLabel = label ? label.textContent : button.textContent;
    button.disabled = true;
    button.classList.add("is-loading");
    if (label && loadingText) label.textContent = loadingText;
    if (spinner) spinner.hidden = false;
    return;
  }
  button.disabled = false;
  button.classList.remove("is-loading");
  if (label) label.textContent = button.dataset.prevLabel || label.textContent;
  if (spinner) spinner.hidden = true;
}

function paintSigned(el, value) {
  if (!el) return;
  const n = parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) {
    el.textContent = "-";
    el.classList.remove("positive", "negative");
    return;
  }
  el.textContent = gw().signedMoney(n);
  el.classList.toggle("positive", n > 0);
  el.classList.toggle("negative", n < 0);
}

function paintMoney(el, value) {
  if (!el) return;
  el.textContent = "$" + gw().money(value);
}

function formatCountdown(seconds) {
  if (seconds == null) return "No expiry on file";
  if (seconds <= 0) return "SUSPENDED — subscription expired";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return d + "d " + h + "h " + m + "m " + s + "s remaining";
}

function brokerPayload() {
  return {
    provider: "mt5_universal",
    server: ($("userBrokerServer")?.value || "").trim(),
    login: ($("userBrokerLogin")?.value || "").trim(),
    account_id: ($("userBrokerLogin")?.value || "").trim(),
    password: $("userBrokerPassword")?.value || "",
    symbol: ($("userBrokerSymbol")?.value || "XAUUSD").trim(),
    connection_mode: "mt5_credentials",
  };
}

function setBrokerLocked(locked) {
  brokerUnlocked = !locked;
  const root = $("brokerGateRoot");
  const overlay = $("brokerLockOverlay");
  if (root) root.classList.toggle("is-locked", locked);
  if (overlay) {
    overlay.hidden = !locked;
    overlay.setAttribute("aria-hidden", locked ? "false" : "true");
    overlay.style.display = locked ? "flex" : "none";
  }
  ["userBrokerServer", "userBrokerLogin", "userBrokerPassword", "userBrokerSymbol"].forEach((id) => {
    const el = $(id);
    if (el) el.disabled = locked;
  });
  const testBtn = $("userBrokerTestBtn");
  const saveBtn = $("userBrokerSaveBtn");
  if (testBtn) testBtn.disabled = locked;
  if (saveBtn) saveBtn.disabled = locked;
  if ($("brokerTierPill")) {
    $("brokerTierPill").textContent = locked ? "LOCKED" : "UNLOCKED";
    $("brokerTierPill").classList.toggle("is-danger", locked);
    $("brokerTierPill").classList.toggle("is-live", !locked);
  }
  if ($("brokerGateLabel")) {
    $("brokerGateLabel").textContent = locked ? "LOCKED" : "UNLOCKED";
    $("brokerGateLabel").classList.toggle("negative", locked);
    $("brokerGateLabel").classList.toggle("positive", !locked);
  }
  if (locked && $("userBrokerResult")) {
    $("userBrokerResult").textContent = "Broker vault terkunci. Aktifkan plan untuk menghubungkan MT5.";
  } else if (!locked && $("userBrokerResult")) {
    $("userBrokerResult").textContent = "Broker gateway terbuka. Isi kredensial MT5 untuk menghubungkan.";
  }
}

function renderBrokerResult(data) {
  const box = $("userBrokerResult");
  if (!box) return;
  const test = data.test || data;
  const ok = Boolean(data.ok ?? test.ok);
  const statusClass = ok ? "positive" : "negative";
  box.innerHTML =
    '<span class="' + statusClass + '"><b>Status:</b> ' + (test.status || (ok ? "CONNECTED" : "FAILED")) + '</span>' +
    "<br><b>Message:</b> " + (test.message || data.error || data.detail?.message || data.detail?.error || "-");
}

function applyPermissions(perms, billing) {
  const tier = perms.tier || billing.tier || "FREE";
  const status = String(billing.status || perms.subscription_status || "unknown").toUpperCase();
  const statusLow = status.toLowerCase();
  const brokerGate = String(perms.broker_gate || billing.broker_gate || "UNLOCKED").toUpperCase();
  const locked =
    brokerGate === "LOCKED" ||
    !perms.broker_unlocked ||
    statusLow === "suspended" ||
    statusLow === "expired" ||
    statusLow === "inactive";

  if ($("userTierPill")) {
    $("userTierPill").textContent = tier;
    $("userTierPill").classList.toggle("is-danger", status === "SUSPENDED" || status === "EXPIRED");
    $("userTierPill").classList.toggle("is-live", status === "ACTIVE");
  }
  if ($("planTierLabel")) $("planTierLabel").textContent = tier;
  if ($("metricSubStatus")) {
    $("metricSubStatus").textContent = status;
    $("metricSubStatus").classList.toggle("negative", status === "SUSPENDED" || status === "EXPIRED");
    $("metricSubStatus").classList.toggle("positive", status === "ACTIVE");
  }
  const seconds = billing.seconds_remaining;
  if ($("metricSubCountdown")) $("metricSubCountdown").textContent = formatCountdown(seconds);
  setBrokerLocked(locked);

  document.querySelectorAll("[data-plan]").forEach((btn) => {
    const key = btn.dataset.plan;
    btn.classList.toggle("is-current", key === tier && status === "ACTIVE");
  });
}

async function refreshIdentity(user) {
  try {
    const identity = await gw().gatewayFetch("/api/user/identity", { retries: 1 });
    currentTenantId = identity.tenant_id || "";
    currentDisplayName = identity.display_name || user?.displayName || user?.email || "";
    renderUserIdentity(currentDisplayName, currentTenantId);
    return identity;
  } catch (_e) {
    currentDisplayName = user?.displayName || user?.email || "";
    renderUserIdentity(currentDisplayName, currentTenantId);
    return null;
  }
}

async function refreshMetrics() {
  const data = await gw().gatewayFetch("/api/user/metrics", { retries: 2 });
  const acc = data.account || {};

  if (data.tenant_id) currentTenantId = data.tenant_id;
  if (data.display_name) currentDisplayName = data.display_name;
  renderUserIdentity(currentDisplayName, currentTenantId);
  
  // Empty state handling for broker metrics
  const hasMetrics = acc.balance != null || acc.equity != null;
  
  paintMoney($("metricBalance"), hasMetrics ? acc.balance : 0);
  paintMoney($("metricEquity"), hasMetrics ? acc.equity : 0);
  paintMoney($("metricMargin"), hasMetrics ? acc.margin : 0);
  paintMoney($("metricFreeMargin"), hasMetrics ? acc.free_margin : 0);
  paintSigned($("metricFloating"), hasMetrics ? acc.floating_pnl : 0);
  
  if ($("metricWinrate")) $("metricWinrate").textContent = (data.winrate ?? 0) + "%";
  if ($("metricPnlSummary")) paintSigned($("metricPnlSummary"), data.pnl_summary);
  if ($("metricTrades")) $("metricTrades").textContent = String(data.trades ?? 0);
  if ($("metricSource")) $("metricSource").textContent = acc.source || "tenant_scoped";
  if ($("gatewayPill")) $("gatewayPill").classList.toggle("is-inactive", !acc.broker_connected);
  if ($("gatewayPillText")) $("gatewayPillText").textContent = acc.broker_connected ? "CONNECTED" : "STANDBY";
}

async function refreshPermissionsAndBilling() {
  const perms = await gw().gatewayFetch("/api/permissions");
  const billing = await gw().gatewayFetch("/api/user/billing");
  applyPermissions(perms, billing);
  return { perms, billing };
}

function buildTripaySandboxPayload(uid, plan) {
  const now = new Date().toISOString();
  return {
    reference: "TRP-SANDBOX-" + Date.now(),
    merchant_ref: uid,
    user_id: uid,
    tier: plan.tier,
    plan: plan.tier,
    payment_method: "QRIS",
    payment_method_code: "QRIS",
    total_amount: plan.amount,
    amount_received: plan.amount,
    status: "PAID",
    paid_at: now,
    note: "sandbox_simulation user_id=" + uid + " tier=" + plan.tier,
  };
}

function paymentSuccessActions(result) {
  const action = result.action || "";
  if (action === "provisioned") {
    toast()?.success("Payment Successful — subscription ACTIVE & MT5 worker spawned.");
  } else if (action === "paid_subscription_active_mt5_failed") {
    toast()?.success("Payment Successful — subscription ACTIVE (MT5 spawn queued).");
  } else if (action === "subscription_failed") {
    toast()?.error("Payment received but subscription activation failed. Check Firestore config.");
  } else {
    toast()?.success("Payment Successful — " + action);
  }
}

async function simulatePayment() {
  if (!selectedPlanKey || !PLANS[selectedPlanKey]) {
    toast()?.info("Pilih tier STARTER, PRO, atau VIP terlebih dahulu.");
    return;
  }
  const user = auth.currentUser;
  if (!user) {
    toast()?.error("Sesi login tidak ditemukan.");
    return;
  }
  const plan = PLANS[selectedPlanKey];
  const btn = $("paySimulationBtn");
  const note = $("paymentStatusNote");
  setButtonLoading(btn, true, "Processing...");
  if (note) note.textContent = "Activating sandbox subscription via API gateway...";
  try {
    const result = await gw().gatewayFetch("/api/billing/simulate", {
      method: "POST",
      body: { tier: plan.tier, plan: plan.tier, subscription_days: 30 },
    });
    paymentSuccessActions(result);
    if (note) {
      note.textContent =
        "Activated — tier: " + (result.tier || plan.tier) + " | broker: UNLOCKED";
    }
    window.location.reload();
  } catch (e) {
    const msg = e.payload?.detail?.message || e.payload?.detail?.error || e.payload?.error || e.message || "Payment simulation failed";
    toast()?.error(msg);
    if (note) note.textContent = "Payment error: " + msg;
    setButtonLoading(btn, false);
  }
}

function updatePayButtonState() {
  const btn = $("paySimulationBtn");
  if (!btn) return;
  btn.disabled = !selectedPlanKey;
}

async function testBrokerConnection() {
  if (!brokerUnlocked) return;
  const btn = $("userBrokerTestBtn");
  setButtonLoading(btn, true, "Testing...");
  if ($("userBrokerResult")) $("userBrokerResult").textContent = "Testing via FastAPI gateway...";
  try {
    const result = await gw().gatewayFetch("/api/broker/test", { method: "POST", body: brokerPayload() });
    renderBrokerResult(result);
    if (result.ok) toast()?.success("Broker Connected — test passed.");
    else toast()?.error(result.test?.message || "Broker test failed.");
  } catch (e) {
    const msg = e.payload?.detail?.message || e.payload?.error || e.message;
    renderBrokerResult({ ok: false, test: { status: "ERROR", message: msg } });
    toast()?.error(msg);
  } finally {
    setButtonLoading(btn, false);
  }
}

async function saveBrokerToVault() {
  if (!brokerUnlocked) return;
  const btn = $("userBrokerSaveBtn");
  setButtonLoading(btn, true, "Encrypting...");
  if ($("userBrokerResult")) $("userBrokerResult").textContent = "Saving AES-256 encrypted credentials...";
  try {
    const result = await gw().gatewayFetch("/api/broker/save", { method: "POST", body: brokerPayload() });
    renderBrokerResult(result);
    toast()?.success("Broker Connected — credentials saved to vault.");
    await refreshMetrics().catch(() => {});
  } catch (e) {
    const msg = e.payload?.detail?.message || e.payload?.error || e.message;
    renderBrokerResult({ ok: false, test: { status: "SAVE_BLOCKED", message: msg } });
    toast()?.error(msg);
  } finally {
    setButtonLoading(btn, false);
  }
}

async function tick() {
  try {
    setPageLoading(true);
    // Network connectivity check
    if (!navigator.onLine) {
      throw new Error("No internet connection");
    }
    await Promise.all([refreshMetrics(), refreshPermissionsAndBilling()]);
    if ($("dashboardNote")) $("dashboardNote").textContent = "Last sync " + new Date().toLocaleTimeString();
  } catch (e) {
    if (e.status === 401) {
      gw().clearToken();
      window.location.replace(AUTH_URL);
      return;
    }
    if (e.message === "No internet connection") {
      if ($("dashboardNote")) $("dashboardNote").textContent = "Offline — waiting for connection...";
      toast()?.warning("No internet connection. Retrying...");
    } else if (e.status === 503) {
      if ($("dashboardNote")) $("dashboardNote").textContent = "Service temporarily unavailable — retrying...";
    } else {
      if ($("dashboardNote")) $("dashboardNote").textContent = "Gateway error: " + e.message;
      toast()?.error("Sync error: " + e.message);
    }
  } finally {
    setPageLoading(false);
  }
}

function bindUi() {
  document.querySelectorAll("[data-plan]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedPlanKey = btn.dataset.plan || null;
      document.querySelectorAll("[data-plan]").forEach((el) => {
        el.classList.toggle("is-selected", el === btn);
      });
      updatePayButtonState();
      if ($("paymentStatusNote")) {
        $("paymentStatusNote").textContent = "Selected: " + selectedPlanKey + " — klik Pay Simulation.";
      }
    });
  });
  $("paySimulationBtn")?.addEventListener("click", simulatePayment);
  $("userBrokerTestBtn")?.addEventListener("click", testBrokerConnection);
  $("userBrokerSaveBtn")?.addEventListener("click", saveBrokerToVault);
  updatePayButtonState();
  setBrokerLocked(true);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUid = "";
    currentTenantId = "";
    currentDisplayName = "";
    requireAuthRedirect();
    return;
  }
  if (currentUid && currentUid !== user.uid) {
    resetDashboardState();
  }
  currentUid = user.uid;
  currentDisplayName = user.displayName || user.email || "";
  const remember = Boolean(localStorage.getItem(gw().TOKEN_KEY));
  const token = await user.getIdToken(true);
  gw().setToken(token, remember);
  bindUi();
  renderUserIdentity(currentDisplayName, currentTenantId);
  await refreshIdentity(user);
  await tick();
  if (!pollStarted) {
    pollStarted = true;
    window.setInterval(tick, POLL_MS);
    window.setInterval(refreshPermissionsAndBilling, BILLING_MS);
  }
});

requireAuthRedirect();
