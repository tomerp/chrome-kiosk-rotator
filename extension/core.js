(() => {
  function validateConfig(raw) {
    if (raw?.rotationSeconds === "" || raw?.rotationSeconds === null) throw new Error("Enter a rotation interval.");
    const rotationSeconds = Number(raw?.rotationSeconds ?? 8);
    if (!Number.isFinite(rotationSeconds) || rotationSeconds < 1 || rotationSeconds > 86400) {
      throw new Error("Rotation interval must be between 1 and 86400 seconds.");
    }
    if (!Array.isArray(raw?.sites) || !raw.sites.length) throw new Error("Add at least one site.");
    const urls = new Set();
    const sites = raw.sites.map((site, index) => {
      let url;
      try { url = new URL(site?.url); }
      catch { throw new Error(`Page ${index + 1}: enter a full URL starting with https:// or http://.`); }
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
        throw new Error("Sites must use HTTP or HTTPS, without credentials in the URL.");
      }
      if (urls.has(url.href)) throw new Error(`Page ${index + 1}: this URL is already in the list.`);
      urls.add(url.href);
      if (site.refreshEverySeconds === "" || site.refreshEverySeconds === null) throw new Error(`Page ${index + 1}: enter a refresh interval, or 0 for never.`);
      const refreshEverySeconds = Number(site.refreshEverySeconds ?? 0);
      if (!Number.isFinite(refreshEverySeconds) || refreshEverySeconds < 0) {
        throw new Error("Refresh intervals must be non-negative seconds.");
      }
      return { ...site, url: url.href, label: String(site.label || url.hostname), refreshEverySeconds };
    });
    return { rotationSeconds, sites };
  }
  function urlMatchesSite(value, site) {
    try {
      const url = new URL(value);
      const target = new URL(site.url);
      // Reuse only this exact origin/path/query/fragment, never a substring match.
      return url.href === target.href;
    } catch { return false; }
  }
  function shouldIgnoreKey(event) {
    if (event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return true;
    const path = event.composedPath?.() || [event.target];
    return path.some((node) => node?.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(node?.tagName || "") ||
      ["textbox", "combobox", "slider", "spinbutton", "button"].includes(node?.getAttribute?.("role")));
  }
  globalThis.KioskCore = { validateConfig, urlMatchesSite, shouldIgnoreKey };
})();
