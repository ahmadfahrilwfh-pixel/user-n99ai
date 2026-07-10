(function () {
  "use strict";

  const gw = () => window.N99Gateway;
  const guard = () => window.N99RouteGuard;
  const AUTH_URL = window.N99_USER_AUTH_URL || window.N99_CONFIG?.LANDING_PATH || "/user";
  const $ = (id) => document.getElementById(id);
  const POLL_MS = 15000;

  let billingState = null;
  let expiryTargetMs = null;

  function formatDate(value) {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  }

  function formatMoney(value) {
    const n = parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(n)) return "-";
    return "Rp " + n.toLocaleString("id-ID");
  }

  function applyBilling(data) {
    billingState = data;
    const tier = data.tier || "FREE";
    const status = String(data.status || data.subscription_status || "unknown").toUpperCase();
    if ($("billingTier")) $("billingTier").textContent = tier;
    if ($("billingStatus")) $("billingStatus").textContent = status;
    if ($("billingDays")) $("billingDays").textContent = data.days_remaining != null ? String(data.days_remaining) : "-";
    if ($("billingBroker")) $("billingBroker").textContent = data.broker_unlocked ? "UNLOCKED" : "LOCKED";
    if ($("billingStatusPill")) {
      $("billingStatusPill").textContent = status;
      $("billingStatusPill").classList.toggle("is-danger", status === "SUSPENDED" || status === "EXPIRED");
      $("billingStatusPill").classList.toggle("is-live", status === "ACTIVE");
    }
    if ($("billingCycleText")) {
      $("billingCycleText").textContent =
        "Activated: " + formatDate(data.activated_at) + " · Expires: " + formatDate(data.expiry_date);
    }
    if ($("billingInvoiceCount")) $("billingInvoiceCount").textContent = String(data.invoice_count || 0);

    const tbody = $("billingInvoiceBody");
    if (tbody) {
      const rows = data.invoices || [];
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="muted">Belum ada invoice tercatat.</td></tr>';
      } else {
        tbody.innerHTML = rows
          .map(function (row) {
            return (
              "<tr><td>" + formatDate(row.paid_at || row.created_at) +
              "</td><td>" + (row.status || "-") +
              "</td><td>" + (row.tier || "-") +
              "</td><td>" + formatMoney(row.amount) +
              "</td><td>" + (row.tripay_reference || row.merchant_ref || row.id || "-") + "</td></tr>"
            );
          })
          .join("");
      }
    }

    if (data.expiry_date) {
      expiryTargetMs = new Date(data.expiry_date).getTime();
    } else if (data.seconds_remaining != null) {
      expiryTargetMs = Date.now() + data.seconds_remaining * 1000;
    }
    paintCountdown();
  }

  function paintCountdown() {
    if (!expiryTargetMs) {
      if ($("billingCountdownLabel")) $("billingCountdownLabel").textContent = "No active expiry timestamp";
      return;
    }
    const seconds = Math.max(0, Math.floor((expiryTargetMs - Date.now()) / 1000));
    const status = billingState ? String(billingState.status || "").toUpperCase() : "";
    const label =
      seconds <= 0 || status === "SUSPENDED" || status === "EXPIRED"
        ? "SUSPENDED — Phase 14 watchdog will reflect instantly"
        : Math.floor(seconds / 86400) + "d " + Math.floor((seconds % 86400) / 3600) + "h " + Math.floor((seconds % 3600) / 60) + "m remaining";

    if ($("billingCountdownLabel")) $("billingCountdownLabel").textContent = label;
    if ($("billingDays")) $("billingDays").textContent = String(Math.floor(seconds / 86400));
    if ($("billingCountdownBar")) {
      const total = billingState?.days_remaining != null ? Math.max(1, billingState.days_remaining) * 86400 : 30 * 86400;
      const pct = Math.max(0, Math.min(100, (seconds / total) * 100));
      $("billingCountdownBar").style.width = pct + "%";
    }
    if (seconds <= 0 && billingState) {
      billingState.status = "SUSPENDED";
      billingState.subscription_status = "suspended";
      if ($("billingStatus")) $("billingStatus").textContent = "SUSPENDED";
      if ($("billingStatusPill")) {
        $("billingStatusPill").textContent = "SUSPENDED";
        $("billingStatusPill").classList.add("is-danger");
        $("billingStatusPill").classList.remove("is-live");
      }
    }
  }

  async function refreshBilling() {
    if (!gw().getToken()) {
      window.location.replace(AUTH_URL);
      return;
    }
    try {
      applyBilling(await gw().gatewayFetch("/api/user/billing"));
    } catch (e) {
      if (e.status === 401) {
        gw().clearToken();
        window.location.replace(AUTH_URL);
        return;
      }
      if ($("billingCountdownLabel")) $("billingCountdownLabel").textContent = "Billing sync error: " + e.message;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    refreshBilling();
    window.setInterval(refreshBilling, POLL_MS);
    window.setInterval(paintCountdown, 1000);
  });
})();
