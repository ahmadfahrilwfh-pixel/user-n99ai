(() => {
  const body = document.body;
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navMenu = document.querySelector("[data-nav-menu]");
  const year = document.querySelector("[data-year]");
  const authOverlay = document.querySelector("[data-auth-modal]");
  const authCloseButtons = document.querySelectorAll("[data-auth-close]");
  const authOpenButtons = document.querySelectorAll("[data-auth-open]");

  const iconsBase = document.querySelector("[data-icons-base]")?.dataset.iconsBase || "";

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  function setNavOpen(isOpen) {
    if (!navMenu || !navToggle) return;
    navMenu.classList.toggle("is-open", isOpen);
    body.classList.toggle("nav-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    const icon = navToggle.querySelector("use");
    if (icon) {
      icon.setAttribute("href", iconsBase + "#" + (isOpen ? "close" : "menu"));
    }
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => setNavOpen(!navMenu.classList.contains("is-open")));

    navMenu.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLAnchorElement) {
        setNavOpen(false);
      }
      if (target instanceof HTMLButtonElement && target.dataset.authOpen) {
        setNavOpen(false);
      }
    });
  }

  function openAuthModal(mode) {
    if (!authOverlay) return;
    authOverlay.classList.add("is-open");
    authOverlay.setAttribute("aria-hidden", "false");
    body.classList.add("nav-open");
    if (mode) {
      window.dispatchEvent(new CustomEvent("n99:auth-mode", { detail: { mode } }));
    }
    const firstInput = authOverlay.querySelector("input:not([type=hidden])");
    if (firstInput instanceof HTMLElement) {
      window.setTimeout(() => firstInput.focus(), 120);
    }
  }

  function closeAuthModal() {
    if (!authOverlay) return;
    authOverlay.classList.remove("is-open");
    authOverlay.setAttribute("aria-hidden", "true");
    body.classList.remove("nav-open");
  }

  authOpenButtons.forEach((button) => {
    button.addEventListener("click", () => openAuthModal(button.dataset.authOpen || "login"));
  });

  authCloseButtons.forEach((button) => button.addEventListener("click", closeAuthModal));

  authOverlay?.addEventListener("click", (event) => {
    if (event.target === authOverlay) closeAuthModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && authOverlay?.classList.contains("is-open")) {
      closeAuthModal();
    }
  });

  window.N99Landing = { openAuthModal, closeAuthModal };

  if (window.N99RouteGuard?.redirectIfAuthenticated()) return;

  const params = new URLSearchParams(window.location.search);
  const hashMode = window.location.hash.replace("#", "");
  if (params.get("auth") === "register" || hashMode === "register") {
    openAuthModal("register");
  } else if (params.get("auth") === "login" || hashMode === "login") {
    openAuthModal("login");
  }

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }
})();
