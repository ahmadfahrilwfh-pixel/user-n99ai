/**
 * Unified frontend configuration for N99 User SaaS.
 * All user-facing pages should load this script before gateway_client.js.
 */
(function () {
  "use strict";

  var API_BASE_URL = "https://api.bos-ww.biz.id";

  window.N99_CONFIG = {
    API_BASE_URL: API_BASE_URL,
    PAYMENT_SANDBOX: true,
    
    // Path routing disesuaikan persis dengan file hasil cetakan build_pages.py
    LANDING_PATH: "/",
    DASHBOARD_PATH: "/panel_dashboard.html",
    BROKER_PATH: "/panel_broker.html",
    BILLING_PATH: "/panel_billing.html",
    
    PLANS: {
      STARTER: { tier: "STARTER", amount: 1000000, deposit: 500, label: "Rp 1.000.000" },
      PRO: { tier: "PRO", amount: 5000000, deposit: 2500, label: "Rp 5.000.000" },
      VIP: { tier: "VIP", amount: 10000000, deposit: 10000, label: "Rp 10.000.000" },
    },
  };

  if (!window.N99_GATEWAY_URL) {
    window.N99_GATEWAY_URL = API_BASE_URL;
  }
})();
