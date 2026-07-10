(function () {
  "use strict";

  const gw = () => window.N99Gateway;
  const AUTH_URL = window.N99_USER_AUTH_URL || window.N99_CONFIG?.LANDING_PATH || "/user";
  const $ = (id) => document.getElementById(id);

  const FORM_INPUT_IDS = [
    "userBrokerServer",
    "userBrokerLogin",
    "userBrokerPassword",
    "userBrokerSymbol",
  ];

  let brokerUnlocked = false;
  let brokerConnected = false;

  function hasSavedBrokerAccount(accounts) {
    if (!Array.isArray(accounts) || !accounts.length) return false;
    return accounts.some(function (acct) {
      if (!acct || typeof acct !== "object") return false;
      const hasIdentity = Boolean(
        String(acct.account_id || "").trim() || String(acct.broker_server || acct.server_url || "").trim()
      );
      const hasSecret = Boolean(acct.has_password || acct.password_saved);
      return hasIdentity && hasSecret;
    });
  }

  function setSelect2Enabled(enabled) {
    try {
      if (window.jQuery && window.jQuery.fn.select2) {
        const $server = window.jQuery("#userBrokerServer");
        if ($server.length) {
          $server.prop("disabled", !enabled);
          if ($server.data("select2")) {
            $server.trigger("change.select2");
          }
        }
      }
    } catch (e) {
      /* non-fatal */
    }
  }

  function setFormEnabled(enabled) {
    FORM_INPUT_IDS.forEach(function (id) {
      const el = $(id);
      if (el) el.disabled = !enabled;
    });
    setSelect2Enabled(enabled);
    const testBtn = $("userBrokerTestBtn");
    const saveBtn = $("userBrokerSaveBtn");
    if (testBtn) testBtn.disabled = !enabled;
    if (saveBtn) saveBtn.disabled = !enabled;
  }

  function showLockOverlay(show) {
    const overlay = $("brokerLockOverlay");
    if (!overlay) return;
    overlay.hidden = !show;
    overlay.setAttribute("aria-hidden", show ? "false" : "true");
    overlay.classList.toggle("is-visible", show);
    overlay.style.display = show ? "flex" : "none";
  }

  function setConnectedView(connected, account) {
    brokerConnected = Boolean(connected);
    const form = $("userBrokerForm");
    const card = $("brokerConnectedCard");

    if (card) {
      card.hidden = !brokerConnected;
      card.setAttribute("aria-hidden", brokerConnected ? "false" : "true");
      card.classList.toggle("is-visible", brokerConnected);
      card.style.display = brokerConnected ? "grid" : "none";
    }

    if (form) {
      form.hidden = brokerConnected;
      form.style.display = brokerConnected ? "none" : "grid";
    }

    if (brokerConnected && account) {
      if ($("connectedBrokerServer")) {
        $("connectedBrokerServer").textContent = account.broker_server || account.server_url || "-";
      }
      if ($("connectedBrokerLogin")) {
        $("connectedBrokerLogin").textContent = account.account_id_masked || account.account_id || "-";
      }
      if ($("connectedBrokerSymbol")) {
        $("connectedBrokerSymbol").textContent = account.symbol || "XAUUSD";
      }
      if ($("userBrokerResult")) {
        $("userBrokerResult").textContent =
          "Broker vault aktif. Gunakan tombol disconnect untuk reset dan hubungkan ulang.";
      }
      setFormEnabled(false);
      return;
    }

    if (brokerUnlocked) {
      setFormEnabled(true);
      if ($("userBrokerResult")) {
        $("userBrokerResult").textContent =
          "Broker gateway terbuka. Pilih server MT5, isi login/password, lalu Save to Vault.";
      }
    }
  }

  async function checkBrokerConnection() {
    if (!gw().getToken() || !brokerUnlocked) {
      setConnectedView(false);
      return;
    }
    try {
      const data = await gw().gatewayFetch("/api/broker/accounts");
      const accounts = Array.isArray(data.accounts) ? data.accounts : [];
      const connected = hasSavedBrokerAccount(accounts);
      const primary = accounts.find(function (a) {
        return a && (a.has_password || a.account_id);
      }) || accounts[0] || null;
      setConnectedView(connected, connected ? primary : null);
    } catch (e) {
      if (e.status !== 401) setConnectedView(false);
    }
  }

  async function disconnectBroker() {
    if (!brokerUnlocked || !brokerConnected) return;
    const btn = $("brokerDisconnectBtn");
    if (btn) btn.disabled = true;
    if ($("userBrokerResult")) $("userBrokerResult").textContent = "Disconnecting broker and resetting vault...";
    try {
      const result = await gw().gatewayFetch("/api/broker/disconnect", { method: "DELETE" });
      if (window.N99Toast) {
        window.N99Toast.success(result.message || "Broker disconnected.");
      }
      window.location.reload();
    } catch (e) {
      const msg = e.payload?.detail?.message || e.payload?.error || e.message;
      if ($("userBrokerResult")) $("userBrokerResult").textContent = "Disconnect failed: " + msg;
      if (window.N99Toast) window.N99Toast.error(msg);
      if (btn) btn.disabled = false;
    }
  }

  function payload() {
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

  function isBrokerLocked(perms) {
    const status = String(perms.subscription_status || "").toLowerCase();
    const brokerGate = String(perms.broker_gate || "UNLOCKED").toUpperCase();
    return (
      brokerGate === "LOCKED" ||
      !perms.broker_unlocked ||
      status === "suspended" ||
      status === "expired" ||
      status === "inactive"
    );
  }

  function setLocked(locked) {
    brokerUnlocked = !locked;
    const root = $("brokerGateRoot");

    if (root) {
      root.classList.toggle("is-locked", locked);
    }

    showLockOverlay(locked);

    if ($("brokerTierPill")) {
      $("brokerTierPill").textContent = locked ? "LOCKED" : "UNLOCKED";
      $("brokerTierPill").classList.toggle("is-danger", locked);
      $("brokerTierPill").classList.toggle("is-live", !locked);
    }

    if (locked) {
      brokerConnected = false;
      setFormEnabled(false);
      const card = $("brokerConnectedCard");
      if (card) {
        card.hidden = true;
        card.classList.remove("is-visible");
        card.style.display = "none";
        card.setAttribute("aria-hidden", "true");
      }
      const form = $("userBrokerForm");
      if (form) {
        form.hidden = false;
        form.style.display = "grid";
      }
      if ($("userBrokerResult")) {
        $("userBrokerResult").textContent =
          "Broker gateway terkunci. Upgrade tier untuk menghubungkan MT5.";
      }
      return;
    }

    setFormEnabled(true);
  }

  function renderResult(data) {
    const box = $("userBrokerResult");
    if (!box) return;
    const test = data.test || data;
    const ok = Boolean(data.ok ?? test.ok);
    box.innerHTML =
      "<b>Status:</b> " + (test.status || (ok ? "OK" : "FAILED")) +
      "<br><b>Message:</b> " + (test.message || data.error || data.detail?.message || "-");
    if (ok && window.N99Toast) {
      window.N99Toast.success("Broker Connected — vault operation succeeded.");
    }
  }

  async function applyBrokerUiState() {
    if (!gw().getToken()) {
      window.location.replace(AUTH_URL);
      return;
    }
    try {
      const perms = await gw().gatewayFetch("/api/permissions");
      const locked = isBrokerLocked(perms);
      setLocked(locked);
      if (!locked) {
        await checkBrokerConnection();
      }
    } catch (e) {
      if (e.status === 401) {
        gw().clearToken();
        window.location.replace(AUTH_URL);
        return;
      }
      setLocked(true);
      if ($("userBrokerResult")) $("userBrokerResult").textContent = "Permission check failed: " + e.message;
    }
  }

  async function testConnection() {
    if (!brokerUnlocked || brokerConnected) return;
    const btn = $("userBrokerTestBtn");
    if (btn) btn.disabled = true;
    if ($("userBrokerResult")) $("userBrokerResult").textContent = "Testing via FastAPI gateway...";
    try {
      const result = await gw().gatewayFetch("/api/broker/test", { method: "POST", body: payload() });
      renderResult(result);
    } catch (e) {
      const msg = e.payload?.detail?.message || e.payload?.error || e.message;
      renderResult({ ok: false, test: { status: "ERROR", message: msg } });
      if (window.N99Toast) window.N99Toast.error(msg);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function saveToVault() {
    if (!brokerUnlocked || brokerConnected) return;
    const btn = $("userBrokerSaveBtn");
    if (btn) btn.disabled = true;
    if ($("userBrokerResult")) $("userBrokerResult").textContent = "Saving encrypted credentials...";
    try {
      renderResult(await gw().gatewayFetch("/api/broker/save", { method: "POST", body: payload() }));
      await checkBrokerConnection();
    } catch (e) {
      const msg = e.payload?.detail?.message || e.payload?.error || e.message;
      renderResult({ ok: false, test: { status: "SAVE_BLOCKED", message: msg } });
      if (window.N99Toast) window.N99Toast.error(msg);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    showLockOverlay(false);
    const card = $("brokerConnectedCard");
    if (card) {
      card.style.display = "none";
      card.classList.remove("is-visible");
    }
    applyBrokerUiState();
    window.setInterval(applyBrokerUiState, 15000);
    $("userBrokerTestBtn")?.addEventListener("click", testConnection);
    $("userBrokerSaveBtn")?.addEventListener("click", saveToVault);
    $("brokerDisconnectBtn")?.addEventListener("click", disconnectBroker);
  });
})();
