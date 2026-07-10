/**
 * N99 Global Error Boundary — Phase 16
 * Catches unhandled errors and provides graceful degradation.
 */
(function () {
  "use strict";

  let errorCount = 0;
  const MAX_ERRORS = 10;
  const RESET_INTERVAL_MS = 60000; // Reset error count every minute

  function showErrorNotification(message, details) {
    const toast = window.N99Toast;
    if (toast && typeof toast.error === "function") {
      toast.error(message);
    } else {
      console.error("[N99 Error Boundary]", message, details);
    }
  }

  function handleError(error, source) {
    errorCount++;
    const msg = error?.message || String(error || "Unknown error");
    const stack = error?.stack || "";
    
    console.error(`[N99 Error Boundary] ${source}:`, error);
    
    if (errorCount < MAX_ERRORS) {
      showErrorNotification(
        `System error: ${msg.slice(0, 80)}`,
        { source, stack: stack.slice(0, 200) }
      );
    } else if (errorCount === MAX_ERRORS) {
      showErrorNotification(
        "Multiple errors detected. Please refresh the page.",
        { source: "error_threshold" }
      );
    }
  }

  // Global error handler
  window.addEventListener("error", function (event) {
    handleError(event.error, "window.error");
    event.preventDefault();
  });

  // Unhandled promise rejection handler
  window.addEventListener("unhandledrejection", function (event) {
    handleError(event.reason, "unhandled_promise");
    event.preventDefault();
  });

  // Reset error count periodically
  setInterval(function () {
    if (errorCount > 0) {
      errorCount = 0;
      console.log("[N99 Error Boundary] Error count reset");
    }
  }, RESET_INTERVAL_MS);

  window.N99ErrorBoundary = {
    handleError,
    getErrorCount: () => errorCount,
  };

  console.log("[N99 Error Boundary] Initialized");
})();
