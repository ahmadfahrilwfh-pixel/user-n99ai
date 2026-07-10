/**
 * Client-side route guards for N99 User SaaS.
 * Protected pages: require Firebase token or redirect to landing.
 * Landing page: redirect authenticated users to dashboard.
 */
(function () {
  "use strict";

  var cfg = window.N99_CONFIG || {};
  var LANDING_URL = window.N99_USER_LANDING_URL || cfg.LANDING_PATH || "/user";
  var DASHBOARD_URL = window.N99_USER_DASHBOARD_URL || cfg.DASHBOARD_PATH || "/user/dashboard";

  function gw() {
    return window.N99Gateway;
  }

  function hasToken() {
    return Boolean(gw() && gw().getToken());
  }

  function requireAuth() {
    if (!hasToken()) {
      window.location.replace(LANDING_URL);
      return false;
    }
    return true;
  }

  function redirectIfAuthenticated() {
    if (hasToken()) {
      window.location.replace(DASHBOARD_URL);
      return true;
    }
    return false;
  }

  window.N99RouteGuard = {
    LANDING_URL: LANDING_URL,
    DASHBOARD_URL: DASHBOARD_URL,
    hasToken: hasToken,
    requireAuth: requireAuth,
    redirectIfAuthenticated: redirectIfAuthenticated,
  };
})();
