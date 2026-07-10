import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "./firebase.config.js";

const ICONS = document.querySelector("[data-icons-base]")?.dataset.iconsBase
  ? document.querySelector("[data-icons-base]").dataset.iconsBase + "#"
  : new URL("../assets/icons/icons.svg", import.meta.url).pathname + "#";
const DASHBOARD_URL = window.N99_USER_DASHBOARD_URL || window.N99_CONFIG?.DASHBOARD_PATH || "/user/dashboard";

const selectors = {
  forms: document.querySelectorAll("[data-form]"),
  modeButtons: document.querySelectorAll("[data-auth-mode]"),
  tabs: document.querySelectorAll(".auth-tabs [data-auth-mode]"),
  title: document.querySelector("#authTitle"),
  subtitle: document.querySelector("[data-auth-subtitle]"),
  message: document.querySelector("[data-auth-message]"),
  referralBanner: document.querySelector("[data-referral-banner]"),
  loginForm: document.querySelector("#loginForm"),
  registerForm: document.querySelector("#registerForm"),
  forgotForm: document.querySelector("#forgotForm"),
  rememberMe: document.querySelector("#rememberMe"),
  googleLogin: document.querySelector("[data-google-login]"),
  verificationPanel: document.querySelector("[data-verification-panel]"),
  verificationEmail: document.querySelector("[data-verification-email]"),
  resendVerification: document.querySelector("[data-resend-verification]"),
  passwordToggles: document.querySelectorAll("[data-toggle-password]"),
};

const copy = {
  login: { title: "Welcome Back", subtitle: "Login untuk mengakses AI trading dashboard." },
  register: { title: "Create Account", subtitle: "Mulai dengan email verification dan referral tracking." },
  forgot: { title: "Account Recovery", subtitle: "Reset password dengan link resmi Firebase." },
};

let lastUnverifiedUser = null;

function gw() {
  return window.N99Gateway;
}

function captureReferral() {
  const code = gw().captureReferralFromUrl();
  if (selectors.referralBanner) {
    selectors.referralBanner.hidden = !code;
    if (code) selectors.referralBanner.textContent = "Referral aktif: " + code;
  }
  return code;
}

async function persistToken(user, remember) {
  const token = await user.getIdToken(true);
  gw().setToken(token, remember);
  return token;
}

async function submitReferral(user) {
  const code = gw().getReferralCode();
  if (!code) return;
  try {
    await gw().gatewayFetch("/api/user/referral", {
      method: "POST",
      body: {
        referral_code: code,
        email: user.email || "",
        display_name: user.displayName || "",
      },
    });
  } catch (e) {
    console.warn("Referral sync failed:", e.message);
  }
}

function closeAuthModal() {
  window.N99Landing?.closeAuthModal?.();
}

async function redirectToDashboard(user, remember) {
  await persistToken(user, remember);
  await submitReferral(user);
  showMessage("Login berhasil. Mengalihkan ke dashboard...", "success");
  closeAuthModal();
  window.setTimeout(() => {
    window.location.href = DASHBOARD_URL;
  }, 650);
}

function setLoading(button, isLoading, loadingText) {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.textContent = loadingText;
    return;
  }
  button.disabled = false;
  button.innerHTML = button.dataset.originalHtml || button.textContent;
}

function showMessage(message, type = "success") {
  if (!selectors.message) return;
  selectors.message.hidden = false;
  selectors.message.textContent = message;
  selectors.message.className = "auth-alert is-" + type;
}

function clearMessage() {
  if (!selectors.message) return;
  selectors.message.hidden = true;
  selectors.message.textContent = "";
  selectors.message.className = "auth-alert";
}

function friendlyError(error) {
  const code = error?.code || "";
  const errors = {
    "auth/configuration-not-found": "Firebase config belum valid. Set N99_FIREBASE_* env vars.",
    "auth/invalid-api-key": "Firebase API key belum valid.",
    "auth/popup-closed-by-user": "Login Google dibatalkan.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/user-not-found": "Akun tidak ditemukan.",
    "auth/wrong-password": "Email atau password salah.",
    "auth/invalid-credential": "Email atau password salah.",
    "auth/email-already-in-use": "Email ini sudah digunakan.",
    "auth/weak-password": "Password terlalu lemah.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Tunggu beberapa menit.",
    "auth/network-request-failed": "Koneksi jaringan bermasalah.",
  };
  return errors[code] || "Terjadi kesalahan autentikasi. Silakan coba lagi.";
}

function setMode(mode) {
  const selectedMode = copy[mode] ? mode : "login";
  clearMessage();
  if (selectors.verificationPanel) selectors.verificationPanel.hidden = true;
  selectors.forms.forEach((form) => form.classList.toggle("is-active", form.dataset.form === selectedMode));
  selectors.tabs.forEach((tab) => {
    const active = tab.dataset.authMode === selectedMode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  if (selectors.title) selectors.title.textContent = copy[selectedMode].title;
  if (selectors.subtitle) selectors.subtitle.textContent = copy[selectedMode].subtitle;
  if (window.location.hash !== "#" + selectedMode) history.replaceState(null, "", "#" + selectedMode);
}

function requireValidForm(form) {
  if (form.checkValidity()) return true;
  form.reportValidity();
  return false;
}

function selectedPersistence() {
  return selectors.rememberMe?.checked ? browserLocalPersistence : browserSessionPersistence;
}

function showVerificationPanel(user) {
  lastUnverifiedUser = user;
  selectors.forms.forEach((form) => form.classList.remove("is-active"));
  if (selectors.verificationPanel) selectors.verificationPanel.hidden = false;
  selectors.tabs.forEach((tab) => tab.classList.remove("is-active"));
  if (selectors.title) selectors.title.textContent = "Email Verification";
  if (selectors.subtitle) selectors.subtitle.textContent = "Aktifkan akun sebelum masuk ke dashboard.";
  if (selectors.verificationEmail) selectors.verificationEmail.textContent = user?.email || "email kamu";
}

async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const button = selectors.googleLogin;
  setLoading(button, true, "Connecting Google...");
  try {
    await setPersistence(auth, selectedPersistence());
    const credential = await signInWithPopup(auth, provider);
    await redirectToDashboard(credential.user, selectors.rememberMe?.checked);
  } catch (error) {
    showMessage(friendlyError(error), "error");
  } finally {
    setLoading(button, false);
  }
}

async function loginWithEmail(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!requireValidForm(form)) return;
  const button = form.querySelector("[data-submit-login]");
  setLoading(button, true, "Checking Access...");
  try {
    await setPersistence(auth, selectedPersistence());
    const credential = await signInWithEmailAndPassword(auth, form.email.value.trim(), form.password.value);
    if (!credential.user.emailVerified) {
      showVerificationPanel(credential.user);
      showMessage("Email belum diverifikasi. Silakan cek inbox kamu.", "error");
      return;
    }
    await redirectToDashboard(credential.user, selectors.rememberMe?.checked);
  } catch (error) {
    showMessage(friendlyError(error), "error");
  } finally {
    setLoading(button, false);
  }
}

async function registerWithEmail(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!requireValidForm(form)) return;
  const button = form.querySelector("[data-submit-register]");
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  setLoading(button, true, "Creating Account...");
  try {
    await setPersistence(auth, browserSessionPersistence);
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(credential.user, { displayName: name });
    await sendEmailVerification(credential.user);
    await submitReferral(credential.user);
    showVerificationPanel(credential.user);
    showMessage("Akun berhasil dibuat. Email verification sudah dikirim.", "success");
    form.reset();
  } catch (error) {
    showMessage(friendlyError(error), "error");
  } finally {
    setLoading(button, false);
  }
}

async function sendResetLink(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!requireValidForm(form)) return;
  const button = form.querySelector("[data-submit-forgot]");
  setLoading(button, true, "Sending Link...");
  try {
    await sendPasswordResetEmail(auth, form.email.value.trim());
    showMessage("Link reset password sudah dikirim.", "success");
    form.reset();
  } catch (error) {
    showMessage(friendlyError(error), "error");
  } finally {
    setLoading(button, false);
  }
}

async function resendVerification() {
  const user = auth.currentUser || lastUnverifiedUser;
  if (!user) {
    showMessage("Silakan login ulang untuk mengirim verification email.", "error");
    setMode("login");
    return;
  }
  setLoading(selectors.resendVerification, true, "Sending...");
  try {
    await sendEmailVerification(user);
    showMessage("Verification email dikirim ulang.", "success");
  } catch (error) {
    showMessage(friendlyError(error), "error");
  } finally {
    setLoading(selectors.resendVerification, false);
  }
}

selectors.passwordToggles.forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.togglePassword);
    const icon = button.querySelector("use");
    if (!input || !icon) return;
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    const iconBase = ICONS.endsWith("#") ? ICONS : ICONS + "#";
    icon.setAttribute("href", iconBase + (isPassword ? "eye-off" : "eye"));
  });
});

selectors.modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.authMode)));
selectors.googleLogin?.addEventListener("click", loginWithGoogle);
selectors.loginForm?.addEventListener("submit", loginWithEmail);
selectors.registerForm?.addEventListener("submit", registerWithEmail);
selectors.forgotForm?.addEventListener("submit", sendResetLink);
selectors.resendVerification?.addEventListener("click", resendVerification);

captureReferral();
setMode(window.location.hash.replace("#", "") in copy ? window.location.hash.replace("#", "") : "login");

window.addEventListener("n99:auth-mode", (event) => {
  const mode = event.detail?.mode;
  if (mode && copy[mode]) setMode(mode);
});

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  const isGoogle = user.providerData.some((p) => p.providerId === "google.com");
  if (isGoogle || user.emailVerified) {
    try {
      await persistToken(user, Boolean(localStorage.getItem(gw().TOKEN_KEY)));
      window.location.replace(DASHBOARD_URL);
    } catch (e) {
      console.warn(e);
    }
    return;
  }
  if (!user.emailVerified && window.location.hash !== "#register") showVerificationPanel(user);
});
