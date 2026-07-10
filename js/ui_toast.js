/**
 * Lightweight toast / snackbar notifications for N99 User SaaS.
 */
(function () {
  "use strict";

  var STACK_ID = "n99ToastStack";
  var DEFAULT_MS = 4200;

  function ensureStack() {
    var stack = document.getElementById(STACK_ID);
    if (stack) return stack;
    stack = document.createElement("div");
    stack.id = STACK_ID;
    stack.className = "toast-stack";
    stack.setAttribute("aria-live", "polite");
    stack.setAttribute("aria-atomic", "false");
    document.body.appendChild(stack);
    return stack;
  }

  function removeToast(node) {
    if (!node || !node.parentNode) return;
    node.classList.remove("is-visible");
    window.setTimeout(function () {
      node.remove();
    }, 220);
  }

  function show(message, type, duration) {
    var stack = ensureStack();
    var toast = document.createElement("div");
    var kind = type || "info";
    toast.className = "toast toast-" + kind;
    toast.setAttribute("role", "status");
    toast.innerHTML =
      '<span class="toast-icon" aria-hidden="true"></span>' +
      '<span class="toast-message"></span>' +
      '<button type="button" class="toast-close" aria-label="Tutup">&times;</button>';
    toast.querySelector(".toast-message").textContent = String(message || "");
    toast.querySelector(".toast-close").addEventListener("click", function () {
      removeToast(toast);
    });
    stack.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add("is-visible");
    });
    window.setTimeout(function () {
      removeToast(toast);
    }, duration != null ? duration : DEFAULT_MS);
    return toast;
  }

  window.N99Toast = {
    show: show,
    success: function (msg, ms) {
      return show(msg, "success", ms);
    },
    error: function (msg, ms) {
      return show(msg, "error", ms);
    },
    info: function (msg, ms) {
      return show(msg, "info", ms);
    },
  };
})();
