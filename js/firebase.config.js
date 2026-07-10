import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const cfg = window.N99_FIREBASE_CONFIG || {};
const firebaseConfig = {
  apiKey: cfg.apiKey || "YOUR_FIREBASE_API_KEY",
  authDomain: cfg.authDomain || "YOUR_FIREBASE_PROJECT.firebaseapp.com",
  projectId: cfg.projectId || "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: cfg.storageBucket || "YOUR_FIREBASE_PROJECT.appspot.com",
  messagingSenderId: cfg.messagingSenderId || "YOUR_FIREBASE_MESSAGING_SENDER_ID",
  appId: cfg.appId || "YOUR_FIREBASE_APP_ID",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.useDeviceLanguage();
