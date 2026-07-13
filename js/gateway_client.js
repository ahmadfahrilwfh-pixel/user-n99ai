(function () {
  "use strict";

  const TOKEN_KEY = "n99_firebase_token";
  const REFERRAL_KEY = "n99_referral_code";

  const BACKOFF_BASE_MS = 1500;
  const BACKOFF_MAX_MS = 120000;
  const CIRCUIT_FAIL_THRESHOLD = 3;
  const CIRCUIT_COOLDOWN_MS = 60000;

  const state = {
    consecutiveFailures: 0,
    circuitOpenUntil: 0,
    lastError: null,
    lastStatus: "unknown",
    backendOnline: null,
  };

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

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function isCircuitOpen() {
    return Date.now() < state.circuitOpenUntil;
  }

  function recordSuccess() {
    state.consecutiveFailures = 0;
    state.circuitOpenUntil = 0;
    state.lastError = null;
    state.lastStatus = "online";
    state.backendOnline = true;
  }

  function recordFailure(err) {
    state.consecutiveFailures += 1;
    state.lastError = err;
    state.backendOnline = false;
    if (err && err.status === 503) {
      state.lastStatus = "api_unavailable";
    } else if (err && (err.name === "TypeError" || /failed to fetch/i.test(String(err.message || "")))) {
      state.lastStatus = "backend_offline";
    } else {
      state.lastStatus = "error";
    }
    if (state.consecutiveFailures >= CIRCUIT_FAIL_THRESHOLD) {
      state.circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
    }
  }

  function backoffDelay(attempt) {
    const exp = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * Math.pow(2, attempt));
    return exp + Math.floor(Math.random() * 400);
  }

  function shouldRetry(err, attempt, maxRetries) {
    if (attempt >= maxRetries) return false;
    if (err && err.status === 401) return false;
    if (err && err.status === 403) return false;
    if (err && err.status === 503) return false;
    if (!err || !err.status || err.status >= 500) return true;
    if (err.name === "TypeError") return true;
    return /failed to fetch|network/i.test(String(err.message || ""));
  }

  async function healthCheck() {
    const base = gatewayBase();
    if (!base) {
      state.backendOnline = false;
      state.lastStatus = "backend_offline";
      return { ok: false, error: "gateway_url_missing" };
    }
    try {
      const res = await fetch(base + "/health?ts=" + Date.now(), {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(function () {
        return { ok: false };
      });
      if (res.ok) {
        recordSuccess();
        return data;
      }
      recordFailure({ status: res.status, message: data.error || "health_failed" });
      return data;
    } catch (err) {
      recordFailure(err);
      return { ok: false, error: String(err.message || err) };
    }
  }

  async function gatewayFetch(path, options) {
    const opts = options || {};
    const method = opts.method || "GET";
    const maxRetries = typeof opts.retries === "number" ? opts.retries : 2;
    const skipCircuit = Boolean(opts.skipCircuit);
    const base = gatewayBase();

    if (!base) {
      const err = new Error("API gateway URL is not configured");
      err.status = 0;
      err.code = "gateway_url_missing";
      throw err;
    }

    if (!skipCircuit && isCircuitOpen()) {
      const err = new Error("API temporarily paused — retrying soon");
      err.status = 503;
      err.code = "circuit_open";
      err.retryAfterMs = Math.max(0, state.circuitOpenUntil - Date.now());
      throw err;
    }

    const url = base + path + (path.indexOf("?") >= 0 ? "&" : "?") + "ts=" + Date.now();
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          method: method,
          cache: "no-store",
          credentials: "include",
          headers: authHeaders(method !== "GET"),
          body: opts.body ? JSON.stringify(opts.body) : undefined,
        });
        const data = await res.json().catch(function () {
          return { ok: false, error: "invalid_json_response" };
        });
        if (!res.ok) {
          const message =
            data.message ||
            data.error ||
            (data.detail && (data.detail.message || data.detail.error)) ||
            "HTTP " + res.status;
          const err = new Error(message);
          err.status = res.status;
          err.payload = data;
          err.code = data.error || (data.detail && data.detail.error) || "http_error";
          throw err;
        }
        recordSuccess();
        return data;
      } catch (e) {
        lastError = e;
        if (shouldRetry(e, attempt, maxRetries)) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        recordFailure(e);
        throw e;
      }
    }
    recordFailure(lastError);
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

  function getConnectionStatus() {
    return {
      status: state.lastStatus,
      backendOnline: state.backendOnline,
      circuitOpen: isCircuitOpen(),
      circuitRetryMs: Math.max(0, state.circuitOpenUntil - Date.now()),
      consecutiveFailures: state.consecutiveFailures,
      lastError: state.lastError ? String(state.lastError.message || state.lastError) : null,
    };
  }

  window.N99Gateway = {
    TOKEN_KEY: TOKEN_KEY,
    REFERRAL_KEY: REFERRAL_KEY,
    gatewayBase: gatewayBase,
    getToken: getToken,
    setToken: setToken,
    clearToken: clearToken,
    authHeaders: authHeaders,
    gatewayFetch: gatewayFetch,
    healthCheck: healthCheck,
    getConnectionStatus: getConnectionStatus,
    postPaymentWebhook: postPaymentWebhook,
    captureReferralFromUrl: captureReferralFromUrl,
    getReferralCode: getReferralCode,
    money: money,
    signedMoney: signedMoney,
  };
})();
