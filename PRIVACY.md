# Privacy

Chrome Kiosk Rotator 0.1.0 runs locally in Chrome. It has no project-operated server, analytics, advertising SDK, or remote-code loader.

## Local information

- Website URLs and display labels are read from the extension's bundled configuration.
- Chrome local extension storage contains cycle tab/window IDs, site indexes, refresh timestamps, pause state, and timing metadata.
- Local cycle state is reset on browser startup and installation/update. Chrome manages removal of extension storage when the extension is uninstalled.
- The extension reads tab URLs to find configured pages and uses page scripts to display controls. The optional Weather Underground handler inspects popup elements to locate an explicit close button.
- The optional developer inspector logs page URLs, element text, styles, and iframe URLs to the local developer console. It is not included in the extension package. Review that output before sharing it.

The project does not collect or transmit this information. Displayed websites operate independently and may collect data under their own policies. Signing into those sites uses your normal Chrome session; this extension does not manage passwords.

The current preview requests HTTP/HTTPS site access to support arbitrary user-configured pages. Reducing this to optional per-site access is planned before store release.

Do not put private URLs, tokens, screenshots, or personal information in public GitHub issues. For non-sensitive questions, use the repository's issue tracker.
