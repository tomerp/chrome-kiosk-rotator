# Privacy

Chrome Kiosk Rotator 0.3.0 runs locally in Chrome. It has no project-operated server, analytics, advertising SDK, or remote-code loader.

## Local information

- Website URLs, display labels, rotation timing, per-page refresh intervals, and overlay visibility are saved in local Chrome extension storage. Public bundled examples are used until the first save. Settings are not synced to other devices.
- Chrome local extension storage contains cycle tab/window IDs, site indexes, refresh timestamps, pause state, and timing metadata.
- Local cycle state is reset on browser startup and installation/update. Saved page settings are retained through restarts and updates. Chrome manages removal of extension storage when the extension is uninstalled.
- The extension reads tab URLs to find configured pages and uses page scripts to display controls. The optional Weather Underground handler inspects popup elements to locate an explicit close button.
- The optional developer inspector logs page URLs, element text, styles, and iframe URLs to the local developer console. It is not included in the extension package. Review that output before sharing it.

The project does not collect or transmit this information. Displayed websites operate independently and may collect data under their own policies. Signing into those sites uses your normal Chrome session; this extension does not manage passwords.

HTTP/HTTPS website access is optional and requested when you save or start, for the exact hosts you configure. Each grant covers all paths and ports on that host, separately for HTTP and HTTPS. No subdomain wildcard is requested. Page scripts are injected only into managed tabs on configured, permitted hosts. Saving a lineup removes grants for hosts no longer used; revoking a required grant stops rotation. The extension does not request the broad tabs permission.

Do not put private URLs, tokens, screenshots, or personal information in public GitHub issues. For non-sensitive questions, use the repository's issue tracker.
