// Public examples only. Keep personal URLs out of commits and shared archives.
// Load the extension/ folder after editing this file.
globalThis.KIOSK_CONFIG = {
  rotationSeconds: 8,
  sites: [
    { url: "https://example.com/", label: "Example dashboard", refreshEverySeconds: 0 },
    { url: "https://example.org/", label: "Example status page", refreshEverySeconds: 0 }
  ]
};
