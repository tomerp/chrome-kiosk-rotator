/*
  Popup Inspector for kiosk debugging

  Usage:
  1. Open Chrome DevTools on the problem tab.
  2. Copy/paste this file into the Console and press Enter.
  3. Run:
       kioskPopupInspector.inspect()
     or:
       kioskPopupInspector.pick()

  What it does:
  - Finds likely popup/modal/overlay candidates in the top document.
  - Lists visible iframes that may contain ad popups.
  - Lets you click an element to inspect its ancestry and styles.

  Important:
  - If the popup is inside a cross-origin iframe, normal page JS cannot inspect
    the iframe's inner DOM. This script will still tell you which iframe is
    likely involved.
*/

(() => {
  const HIGHLIGHT_ID = "__kiosk_popup_inspector_highlight__";

  function inspect() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const overlayCandidates = Array.from(document.querySelectorAll("body *"))
      .filter((element) => element instanceof HTMLElement)
      .map((element) => describeElement(element))
      .filter((item) => item && item.visible)
      .filter((item) => {
        const position = item.style.position;
        const largeEnough = item.rect.width >= 180 && item.rect.height >= 120;
        const likelyOverlayPosition =
          position === "fixed" || position === "sticky" || position === "absolute";
        const highZ = item.zIndex >= 100;
        const looksLikeDialog =
          item.role === "dialog" ||
          item.ariaModal === "true" ||
          /modal|popup|overlay|interstitial|lightbox|dialog/i.test(item.classAndId);

        return largeEnough && (likelyOverlayPosition || highZ || looksLikeDialog);
      })
      .sort((a, b) => {
        if (b.zIndex !== a.zIndex) {
          return b.zIndex - a.zIndex;
        }

        return b.rect.width * b.rect.height - a.rect.width * a.rect.height;
      })
      .slice(0, 12);

    const iframeCandidates = Array.from(document.querySelectorAll("iframe"))
      .map((iframe) => describeIframe(iframe))
      .filter(Boolean)
      .filter((item) => item.visible)
      .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);

    console.group("Popup Inspector");
    console.log("Page URL:", window.location.href);
    console.log("Viewport:", { width: viewportWidth, height: viewportHeight });

    console.group("Likely overlay/modal elements");
    if (!overlayCandidates.length) {
      console.log("No obvious top-document overlay candidates found.");
    } else {
      overlayCandidates.forEach((item, index) => {
        console.group(`#${index + 1} ${item.summary}`);
        console.log(item);
        console.groupEnd();
      });
    }
    console.groupEnd();

    console.group("Visible iframes");
    if (!iframeCandidates.length) {
      console.log("No visible iframes found.");
    } else {
      iframeCandidates.forEach((item, index) => {
        console.group(`#${index + 1} ${item.summary}`);
        console.log(item);
        console.groupEnd();
      });
    }
    console.groupEnd();

    console.groupEnd();

    return {
      overlays: overlayCandidates,
      iframes: iframeCandidates
    };
  }

  function pick() {
    clearHighlight();
    console.log("Popup Inspector pick mode: click the popup or close button to inspect it.");

    const onClick = (event) => {
      event.preventDefault();
      event.stopPropagation();

      const element = event.target;
      highlightElement(element);
      logPickedElement(element);

      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        console.log("Popup Inspector pick mode cancelled.");
        document.removeEventListener("click", onClick, true);
        document.removeEventListener("keydown", onKeyDown, true);
        clearHighlight();
      }
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
  }

  function logPickedElement(element) {
    const description = describeElement(element);
    const ancestry = [];
    let current = element;

    while (current && current instanceof HTMLElement && ancestry.length < 8) {
      ancestry.push(describeElement(current));
      current = current.parentElement;
    }

    console.group("Picked element");
    console.log(description);
    console.group("Ancestry");
    ancestry.forEach((item, index) => {
      console.group(`#${index + 1} ${item.summary}`);
      console.log(item);
      console.groupEnd();
    });
    console.groupEnd();
    console.groupEnd();
  }

  function describeElement(element) {
    if (!(element instanceof HTMLElement)) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const visible =
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      rect.width > 0 &&
      rect.height > 0;

    const text = normalizeText(
      [
        element.innerText,
        element.textContent,
        element.getAttribute("aria-label"),
        element.getAttribute("title")
      ]
        .filter(Boolean)
        .join(" ")
    ).slice(0, 160);

    const zIndex = parseZIndex(style.zIndex);
    const selector = buildSelector(element);
    const classAndId = `${element.id ? `#${element.id}` : ""} ${element.className || ""}`.trim();
    const role = element.getAttribute("role") || "";
    const ariaModal = element.getAttribute("aria-modal") || "";

    return {
      summary: `${element.tagName.toLowerCase()} ${selector}`,
      tagName: element.tagName.toLowerCase(),
      selector,
      classAndId,
      role,
      ariaModal,
      text,
      visible,
      zIndex,
      style: {
        position: style.position,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        pointerEvents: style.pointerEvents,
        overflow: style.overflow,
        zIndex: style.zIndex
      },
      rect: simplifyRect(rect)
    };
  }

  function describeIframe(iframe) {
    if (!(iframe instanceof HTMLIFrameElement)) {
      return null;
    }

    const rect = iframe.getBoundingClientRect();
    const style = window.getComputedStyle(iframe);
    const visible =
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      rect.width > 0 &&
      rect.height > 0;

    let sameOrigin = false;

    try {
      sameOrigin = Boolean(iframe.contentWindow?.document);
    } catch (error) {
      sameOrigin = false;
    }

    return {
      summary: `iframe ${buildSelector(iframe)}`,
      selector: buildSelector(iframe),
      src: iframe.src || "",
      title: iframe.title || "",
      visible,
      sameOrigin,
      style: {
        position: style.position,
        zIndex: style.zIndex,
        pointerEvents: style.pointerEvents
      },
      rect: simplifyRect(rect)
    };
  }

  function buildSelector(element) {
    if (!(element instanceof HTMLElement)) {
      return "<unknown>";
    }

    const parts = [element.tagName.toLowerCase()];

    if (element.id) {
      parts.push(`#${element.id}`);
    }

    const classList = Array.from(element.classList).slice(0, 3);
    classList.forEach((className) => {
      parts.push(`.${className}`);
    });

    return parts.join("");
  }

  function simplifyRect(rect) {
    return {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom)
    };
  }

  function parseZIndex(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function highlightElement(element) {
    clearHighlight();

    if (!(element instanceof HTMLElement)) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const highlight = document.createElement("div");
    highlight.id = HIGHLIGHT_ID;
    highlight.style.position = "fixed";
    highlight.style.left = `${rect.left}px`;
    highlight.style.top = `${rect.top}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
    highlight.style.border = "3px solid #ff4d4f";
    highlight.style.background = "rgba(255, 77, 79, 0.12)";
    highlight.style.zIndex = "2147483647";
    highlight.style.pointerEvents = "none";
    document.documentElement.appendChild(highlight);
  }

  function clearHighlight() {
    const existing = document.getElementById(HIGHLIGHT_ID);
    if (existing) {
      existing.remove();
    }
  }

  window.kioskPopupInspector = {
    inspect,
    pick,
    clearHighlight
  };

  console.log("Popup Inspector loaded. Run kioskPopupInspector.inspect() or kioskPopupInspector.pick().");
})();
