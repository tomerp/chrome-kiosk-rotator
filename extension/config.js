// First-run defaults. User changes are saved locally through the settings screen.
// Keep these public examples free of personal URLs.
globalThis.KIOSK_CONFIG = {
  rotationSeconds: 8,
  sites: [
    { url: "https://example.com/", label: "Example dashboard", refreshEverySeconds: 0 },
    { url: "https://example.org/", label: "Example status page", refreshEverySeconds: 0 }
  ]
};
