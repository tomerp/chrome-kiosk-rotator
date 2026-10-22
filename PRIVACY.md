# Privacy — Kiosk Rotator

Effective date: October 21, 2026. Applies to version 0.3.1.

Kiosk Rotator runs locally in your browser. It has no developer-operated server, advertising, analytics, or remote extension-code loader. The extension does not send your settings, URLs, page contents, or display activity to the developer or other recipients.

## Information handled locally

- **Configuration:** website URLs, labels, page order, rotation timing, refresh intervals, and overlay visibility are stored in local extension storage. Public examples are used until you save settings. Settings are not synced between devices.
- **Display activity:** tab/window identifiers, site indexes, active page, pause state, refresh timestamps, and scheduling metadata are stored locally to operate the display. The extension processes its keyboard shortcuts and toolbar commands; it does not record arbitrary keystrokes or general mouse activity.
- **Website access:** matching tab URLs are read to find and reuse your configured pages. A bundled page script provides the timer, optional countdown overlay, and keyboard controls in managed tabs on configured, permitted hosts. Page contents are not harvested or stored.
- **Optional legacy popup handler:** when explicitly enabled through source configuration, the Weather Underground handler inspects known page elements to locate a close button. It is disabled in public defaults. It does not send page content to the developer.

## Permissions and your choices

HTTP/HTTPS website access is optional and requested when you save or start, for the exact hosts you configure. Each grant covers all paths and ports on that host, separately for HTTP and HTTPS; subdomain wildcards are not requested. The extension does not request the broad tabs permission.

Saving a lineup removes grants for hosts no longer used. Revoking required access through the browser stops rotation. You can edit or remove saved URLs in Settings. Avoid putting passwords, access tokens, or other unnecessary sensitive information in your URLs or labels.

## Retention and deletion

Saved configuration remains in your browser profile until you replace it, clear the extension's storage, or uninstall the extension. Stop clears the active cycle; browser startup and extension installation/update also reset cycle state while retaining saved settings. Removing a page and saving removes it from the saved lineup. Uninstalling removes the extension's local storage through the browser.

Stopping the display does not close its tabs or delete browsing history, website cookies, website data, or backups maintained independently by your browser or operating system.

## Data use and sharing

Kiosk Rotator uses locally handled data only to provide the display features described above. It does not sell data, transfer data for advertising, use data to determine creditworthiness, or give the developer remote access to your data. Its use of information complies with the Chrome Web Store User Data Policy, including the Limited Use requirements.

Displayed websites operate independently and make their own network requests under their own privacy policies. Signing into those websites uses your normal browser session; this extension does not read login cookies or manage passwords.

The separate developer helper in the source repository (`tools/popup-inspector.js`) is not included in the extension package. If you run it yourself, it logs page details to your local developer console. Review that output before sharing it.

## Support

For non-sensitive questions, use [GitHub Issues](https://github.com/tomerp/chrome-kiosk-rotator/issues). GitHub processes submissions under its own policies; public issues can be read by others. Do not include private URLs, tokens, screenshots of private pages, or personal information in public support requests.
