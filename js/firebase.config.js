import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const DEFAULTS = {
  apiKey: "AIzaSyBg_BK8vZH2olvDTwIss6F9c1OuiZPV0Og",
  authDomain: "n99-saas-trading.firebaseapp.com",
  projectId: "n99-saas-trading",
  storageBucket: "n99-saas-trading.firebasestorage.app",
  messagingSenderId: "840525105232",
  appId: "1:840525105232:web:f375cc7344a57a19f82955",
  measurementId: "G-8202HE9J7Y",
};

const cfg = window.N99_FIREBASE_CONFIG || {};
const firebaseConfig = {
  apiKey: cfg.apiKey || DEFAULTS.apiKey,
  authDomain: cfg.authDomain || DEFAULTS.authDomain,
  projectId: cfg.projectId || DEFAULTS.projectId,
  storageBucket: cfg.storageBucket || DEFAULTS.storageBucket,
  messagingSenderId: cfg.messagingSenderId || DEFAULTS.messagingSenderId,
  appId: cfg.appId || DEFAULTS.appId,
  measurementId: cfg.measurementId || DEFAULTS.measurementId,
};

const PLACEHOLDER_VALUES = new Set([
  "",
  "YOUR_FIREBASE_API_KEY",
  "YOUR_FIREBASE_PROJECT.firebaseapp.com",
  "YOUR_FIREBASE_PROJECT_ID",
  "YOUR_FIREBASE_PROJECT.appspot.com",
  "YOUR_FIREBASE_MESSAGING_SENDER_ID",
  "YOUR_FIREBASE_APP_ID",
]);

function isPlaceholder(value) {
  return PLACEHOLDER_VALUES.has(String(value || "").trim());
}

function validateFirebaseConfig(config) {
  const missing = [];
  if (isPlaceholder(config.apiKey)) missing.push("apiKey");
  if (isPlaceholder(config.authDomain)) missing.push("authDomain");
  if (isPlaceholder(config.projectId)) missing.push("projectId");
  if (isPlaceholder(config.appId)) missing.push("appId");
  return missing;
}

const missingKeys = validateFirebaseConfig(firebaseConfig);
let app = null;
let auth = null;
let initError = null;

if (missingKeys.length) {
  initError = new Error(
    "Firebase config incomplete: " + missingKeys.join(", ") + ". Set N99_FIREBASE_* env vars."
  );
  console.error("[N99 Firebase]", initError.message);
  window.N99_FIREBASE_INIT_ERROR = initError.message;
} else {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    auth.useDeviceLanguage();
    window.N99_FIREBASE_INIT_ERROR = null;
  } catch (err) {
    initError = err;
    console.error("[N99 Firebase] initialization failed:", err);
    window.N99_FIREBASE_INIT_ERROR = String(err.message || err);
  }
}

export { app, auth, initError, firebaseConfig };
