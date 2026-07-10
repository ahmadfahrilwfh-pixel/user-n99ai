(function () {
  "use strict";

  const TOKEN_KEY = "n99_firebase_token";
  const REFERRAL_KEY = "n99_referral_code";

  function gatewayBase() {
    var cfg = window.N99_CONFIG || {};
    return String(window.N99_GATEWAY_URL || cfg.API_BASE_URL || "").replace(/\/$/, "");
  }

  function getToken() {
    return (
      window.N99_FIREBASE_TOKEN ||
      localStorage.getItem(TOKEN_KEY) ||
      sessionStorage.getItem(TOKEN_KEY) ||
      ""
    );
  }

  function setToken(token, persist) {
    const value = String(token || "").trim();
    if (!value) return;
    window.N99_FIREBASE_TOKEN = value;
    if (persist) {
      localStorage.setItem(TOKEN_KEY, value);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, value);
    }
  }

  function clearToken() {
    window.N99_FIREBASE_TOKEN = "";
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }

  function authHeaders(json) {
    const headers = { Accept: "application/json" };
    if (json) headers["Content-Type"] = "application/json";
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }

  async function gatewayFetch(path, options) {
    const opts = options || {};
    const method = opts.method || "GET";
    const maxRetries = opts.retries || 0;
    const url = gatewayBase() + path + (path.indexOf("?") >= 0 ? "&" : "?") + "ts=" + Date.now();
    
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          method,
          cache: "no-store",
          headers: authHeaders(method !== "GET"),
          body: opts.body ? JSON.stringify(opts.body) : undefined,
        });
        const data = await res.json().catch(function () {
          return { ok: false, error: "invalid_json_response" };
        });
        if (!res.ok) {
          const err = new Error(data.error || data.detail?.error || data.detail?.message || "HTTP " + res.status);
          err.status = res.status;
          err.payload = data;
          throw err;
        }
        return data;
      } catch (e) {
        lastError = e;
        if (attempt < maxRetries && (!e.status || e.status >= 500)) {
          // Retry on network errors or 5xx, wait 500ms before retry
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          continue;
        }
        throw e;
      }
    }
    throw lastError;
  }

  async function postPaymentWebhook(payload) {
    const cfg = window.N99_CONFIG || {};
    const url = gatewayBase() + "/api/v1/payments/webhook";
    const body = JSON.stringify(payload || {});
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (cfg.PAYMENT_SANDBOX !== false) {
      headers["X-N99-Payment-Sandbox"] = "1";
    }
    const res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: headers,
      body: body,
    });
    const data = await res.json().catch(function () {
      return { ok: false, error: "invalid_json" };
    });
    if (!res.ok) {
      const err = new Error(data.error || data.detail?.error || "HTTP " + res.status);
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  }

  function captureReferralFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const ref = (params.get("ref") || params.get("referral") || "").trim().toUpperCase();
    if (ref) sessionStorage.setItem(REFERRAL_KEY, ref);
    return sessionStorage.getItem(REFERRAL_KEY) || "";
  }

  function getReferralCode() {
    return sessionStorage.getItem(REFERRAL_KEY) || captureReferralFromUrl();
  }

  function money(value) {
    const n = parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(n)) return "-";
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function signedMoney(value) {
    const n = parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(n)) return "-";
    const prefix = n > 0 ? "+$" : n < 0 ? "-$" : "$";
    return prefix + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  window.N99Gateway = {
    TOKEN_KEY,
    REFERRAL_KEY,
    gatewayBase,
    getToken,
    setToken,
    clearToken,
    authHeaders,
    gatewayFetch,
    postPaymentWebhook,
    captureReferralFromUrl,
    getReferralCode,
    money,
    signedMoney,
  };
})();
