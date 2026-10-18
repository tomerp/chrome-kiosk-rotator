(() => {
  if (window.top !== window) return;
  if (globalThis.kioskRotatorRefresh) { globalThis.kioskRotatorRefresh(); return; }
  const overlayId = "chrome-kiosk-rotator-root";
  let managed = false, active = false, paused = false;
  let currentIndex = -1, totalSites = 0, currentSite = null;
  let nextSwitchAt = null, token = null, version = -1;
  let ui = null, rotationTimer = null, countdownTimer = null;
  let popupIntervalId = null, popupTimeoutId = null;

  function send(message, callback = () => {}) {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) { cleanup(); return; }
        callback(response);
      });
    } catch { cleanup(); }
  }
  function refreshState() { send({ type: "getCycleState" }, applyState); }
  globalThis.kioskRotatorRefresh = refreshState;
  function applyState(state) {
    if (!state || !Number.isFinite(state.version) || state.version < version) return;
    version = state.version;
    managed = state.managed;
    active = state.active;
    paused = state.paused;
    currentIndex = state.currentIndex;
    totalSites = state.totalSites;
    currentSite = state.currentSite;
    nextSwitchAt = state.nextSwitchAt;
    token = state.token;
    clearTimeout(rotationTimer);
    clearInterval(countdownTimer);
    clearPopupDismissalWindow();
    if (!managed) { ui?.host.remove(); ui = null; return; }
    ui ||= injectOverlay();
    updateStatus();
    updateCountdown();
    if (document.visibilityState !== "visible" || !active) return;
    countdownTimer = setInterval(updateCountdown, 100);
    if (!paused && Number.isFinite(nextSwitchAt)) {
      const expectedToken = token;
      rotationTimer = setTimeout(() => {
        if (!managed || !active || paused || document.visibilityState !== "visible") return;
        send({ type: "rotationDue", token: expectedToken }, () => refreshState());
      }, Math.max(0, nextSwitchAt - Date.now()));
    }
    startPopupDismissalWindow();
  }
  function updateStatus() {
    if (ui && currentSite) ui.status.textContent = `${paused ? "Paused" : "Showing"} ${currentIndex + 1}/${totalSites}: ${currentSite.label}`;
  }
  function updateCountdown() {
    if (!ui) return;
    ui.countdown.textContent = paused ? "Paused" : totalSites === 1 ? "Single page" :
      !active || document.visibilityState !== "visible" ? "Standby" :
      nextSwitchAt === null ? "Waiting" : `Next in ${(Math.max(0, nextSwitchAt - Date.now()) / 1000).toFixed(1)}s`;
  }
  function handleVisibilityChange() {
    clearTimeout(rotationTimer);
    clearInterval(countdownTimer);
    clearPopupDismissalWindow();
    if (document.visibilityState === "visible") refreshState();
  }
  function handleKeydown(event) {
    if (!managed || !active || KioskCore.shouldIgnoreKey(event)) return;
    const offset = event.code === "ArrowRight" ? 1 : event.code === "ArrowLeft" ? -1 : 0;
    if (!offset && event.code !== "Space") return;
    event.preventDefault();
    send(offset ? { type: "activateRelativeTab", offset } : { type: "setPaused", paused: !paused });
  }
  function handleMessage(message) { if (message?.type === "cycleState") applyState(message.state); }
  function handlePageHide(event) {
    if (!event.persisted) { cleanup(); return; }
    clearTimeout(rotationTimer);
    clearInterval(countdownTimer);
    clearPopupDismissalWindow();
  }
  function handlePageShow(event) { if (event.persisted) refreshState(); }
  function cleanup() {
    clearTimeout(rotationTimer);
    clearInterval(countdownTimer);
    clearPopupDismissalWindow();
    ui?.host.remove();
    ui = null;
    managed = false;
    delete globalThis.kioskRotatorRefresh;
    window.removeEventListener("keydown", handleKeydown, true);
    window.removeEventListener("pagehide", handlePageHide);
    window.removeEventListener("pageshow", handlePageShow);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    try { chrome.runtime.onMessage.removeListener(handleMessage); } catch { /* Extension reloaded. */ }
  }
  chrome.runtime.onMessage.addListener(handleMessage);
  window.addEventListener("keydown", handleKeydown, true);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", handlePageHide);
  window.addEventListener("pageshow", handlePageShow);
  refreshState();

  function injectOverlay() {
    const existing = document.getElementById(overlayId);

    if (existing?.shadowRoot) {
      return {
        host: existing,
        status: existing.shadowRoot.getElementById("status"),
        countdown: existing.shadowRoot.getElementById("countdown")
      };
    }

    const host = document.createElement("div");
    host.id = overlayId;
    host.style.position = "fixed";
    host.style.left = "16px";
    host.style.right = "16px";
    host.style.bottom = "16px";
    host.style.zIndex = "2147483647";
    host.style.pointerEvents = "none";

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        .overlay {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 10px 14px;
          background: rgba(0, 0, 0, 0.9);
          border: 1px solid rgba(55, 255, 139, 0.35);
          border-radius: 10px;
          box-shadow: 0 0 18px rgba(55, 255, 139, 0.12);
          color: #37ff8b;
          font: 14px/1.4 "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
          text-shadow: 0 0 6px rgba(55, 255, 139, 0.45);
        }

        .status {
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .meta {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }

        .countdown {
          min-width: 110px;
          text-align: right;
          color: #79ffb0;
          font-variant-numeric: tabular-nums;
        }

        .hint {
          color: #37ff8b;
          white-space: nowrap;
        }

        strong {
          color: #b8ffd2;
        }
      </style>
      <div class="overlay">
        <div id="status" class="status"></div>
        <div class="meta">
          <div id="countdown" class="countdown"></div>
          <div class="hint">Keys: <strong>Left</strong>/<strong>Right</strong> switch, <strong>Space</strong> pause</div>
        </div>
      </div>
    `;

    document.documentElement.appendChild(host);

    return {
      host,
      status: shadow.getElementById("status"),
      countdown: shadow.getElementById("countdown")
    };
  }

  function startPopupDismissalWindow() {
    clearPopupDismissalWindow();

    if (document.visibilityState !== "visible") {
      return;
    }

    const popupRules = currentSite?.popupRules;

    if (!popupRules?.enabled) {
      return;
    }

    const retryIntervalMs = normalizePositiveNumber(popupRules.retryIntervalMs, 1000);
    const retryForMs = normalizePositiveNumber(popupRules.retryForSeconds, 10) * 1000;

    runPopupDismissalPass(popupRules);

    popupIntervalId = window.setInterval(() => {
      runPopupDismissalPass(popupRules);
    }, retryIntervalMs);

    popupTimeoutId = window.setTimeout(() => {
      clearPopupDismissalWindow();
    }, retryForMs);
  }

  function clearPopupDismissalWindow() {
    if (popupIntervalId) {
      window.clearInterval(popupIntervalId);
      popupIntervalId = null;
    }

    if (popupTimeoutId) {
      window.clearTimeout(popupTimeoutId);
      popupTimeoutId = null;
    }
  }

  function runPopupDismissalPass(popupRules) {
    if (!document.body) {
      return;
    }

    if (popupRules.handler === "wunderground-bx") {
      dismissWundergroundBxPopup();
      return;
    }
  }

  function dismissWundergroundBxPopup() {
    const dialog = document.querySelector("[id^='bx-campaign-'][role='dialog']");
    const slab = document.querySelector(".bx-slab");
    const overlayActive = document.documentElement.classList.contains("bx-client-overlay");

    if (!dialog && !slab && !overlayActive) {
      return false;
    }

    const candidates = queryElements([
      "[id^='bx-close-inside-'].bx-close.bx-close-link.bx-close-inside",
      "[role='dialog'] [id^='bx-close-inside-']",
      "[role='dialog'] .bx-close.bx-close-link.bx-close-inside"
    ]);

    for (const element of candidates) {
      if (!isSafeWundergroundCloseTarget(element)) {
        continue;
      }

      clickElement(element);
      return true;
    }

    return false;
  }

  function isElementVisible(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function isLikelyClickable(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    const role = (element.getAttribute("role") || "").toLowerCase();
    const style = window.getComputedStyle(element);

    return (
      tagName === "button" ||
      tagName === "a" ||
      role === "button" ||
      typeof element.onclick === "function" ||
      element.hasAttribute("onclick") ||
      element.tabIndex >= 0 ||
      style.cursor === "pointer"
    );
  }

  function isSafeWundergroundCloseTarget(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    if (!isElementVisible(element) || !isLikelyClickable(element)) {
      return false;
    }

    const dialog = element.closest("[id^='bx-campaign-'][role='dialog']");
    const slab = element.closest(".bx-slab");
    const hasExpectedClass =
      element.classList.contains("bx-close") &&
      element.classList.contains("bx-close-link") &&
      element.classList.contains("bx-close-inside");
    const href = (element.getAttribute("href") || "").trim().toLowerCase();

    return (
      hasExpectedClass &&
      Boolean(dialog || slab) &&
      (href === "" || href === "javascript:void(0)" || href === "#")
    );
  }

  function queryElements(selectors) {
    const seen = new Set();
    const results = [];

    for (const selector of selectors) {
      let elements = [];

      try {
        elements = Array.from(document.querySelectorAll(selector));
      } catch (error) {
        continue;
      }

      for (const element of elements) {
        if (seen.has(element)) {
          continue;
        }

        seen.add(element);
        results.push(element);
      }
    }

    return results;
  }

  function clickElement(element) {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    element.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function normalizePositiveNumber(value, fallbackValue) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallbackValue;
  }
})();
