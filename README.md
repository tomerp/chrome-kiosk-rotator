# Chrome Kiosk Rotator

Turn a Chrome window into a rotating display of your dashboards, status pages, and other websites.

Chrome Kiosk Rotator keeps one tab open per site and switches between them, so pages can retain their existing browser sessions. An optional compact green-on-black overlay shows the current page and time to the next switch.

**Status: community preview (0.3.0).** Install from source today. A settings interface is included; a Chrome Web Store release is planned. This version has not been submitted to the store. Browser and packaged-extension acceptance testing is still pending. Automated tests use simulated Chrome APIs and page environments.

## Features

- A settings screen to add, remove, rename, and reorder pages without editing code.
- Configurable rotation interval, including an eight-second default.
- Reuse already open tabs when the full URL matches, or create new ones without replacing your current page.
- Arrow keys to switch; Space to pause or resume.
- Optional per-site refresh, performed while the tab is inactive.
- Optional Weather Underground popup-close handler, disabled in the public example.
- Toolbar popup with Start, Pause/Resume, Stop, current status, and Settings. Stopping leaves your tabs open.
- Hide the countdown overlay while keeping rotation and keyboard controls.
- Website access requested only for the hosts you configure.
- Local operation: no project backend, accounts, analytics, or remote extension code.

## Install the preview

1. Download this repository using **Code → Download ZIP**, then extract it, or clone it.
2. Keep the extracted folder somewhere permanent. No build step or configuration-file edit is needed.
3. Open `chrome://extensions` in Chrome 120 or newer.
4. Enable **Developer mode**, choose **Load unpacked**, and select the **extension** subfolder.
5. Settings opens on first install. Add your pages, choose timing and refresh intervals, then select **Save settings** and **Start display**. Approve access to your selected websites when prompted. To return later, open the toolbar popup and select **Settings**.
6. Enter Chrome fullscreen using your operating system's normal fullscreen control.

The example configuration uses `example.com` and `example.org`, so it is safe to share. Replace them with useful pages in Settings before using your display.

This extension manages one rotation window at a time. It does not launch Chrome in kiosk mode, lock down the operating system, or prevent users from leaving fullscreen. Use a dedicated Chrome profile/window for an unattended display. Automatic launch, login and recovery after a reboot are separate deployment tasks.

## Configure in Settings

Open the extension toolbar popup and choose **Settings**, right-click the icon and choose **Options**, or use **Extension options** on its Details page in `chrome://extensions`.

- **Add page:** enter a full HTTP or HTTPS URL and an optional display name.
- **Reorder:** use the up/down arrows. Page names and refresh intervals move with the URL.
- **Rotation timing:** set how many seconds each page stays on screen (1–86400, including fractional seconds).
- **Refresh every:** choose seconds, minutes, or hours for each page. Zero means never force a reload.
- **Show countdown overlay:** uncheck for a clean display; rotation and keyboard controls remain available.
- **Save settings:** saves locally in your Chrome profile and stops the current cycle, leaving tabs open.
- **Start display:** starts the saved lineup in this window. Save or discard pending edits first.
- **Reload saved:** discard unsaved edits and return to the saved configuration.

Settings persist through worker restarts, browser restarts, and extension updates. They are not synced between devices. If settings are open in two tabs, a stale tab cannot silently overwrite newer changes; reload saved settings first. Invalid or duplicate URLs, empty lineups, and invalid timing values are rejected before a running cycle is changed.

Refresh checks happen on tab transitions. They are not independent schedules and do not refresh the active page or a single-page cycle.

Existing tabs are reused only when the complete URL matches. After a cycle starts, a tab stays assigned to its configured site even if that site redirects it through login. A later start may create another tab if its URL has changed. Page timers and controls require a configured, permitted host; a redirect to another host uses the slower recovery alarm. Configure the final destination URL after login when possible.

`extension/config.js` supplies first-run defaults only. Existing source installations that customized that file use those values until their first settings save; saved settings then take precedence. Keep bundled defaults public and keep private URLs out of commits, screenshots, and shared archives.

## Controls

| Control | Action |
| --- | --- |
| Toolbar icon | Open status and Start, Pause/Resume, Stop, Settings controls |
| Right / Left arrow | Next / previous page |
| Space | Pause / resume |
| Switch to a non-kiosk tab in the same window | Pause rotation |

Use Resume in the popup to return to the display, or return to a kiosk tab and press Space after switching away. Shortcuts do not intercept typing, text composition, modified key combinations, or focused links and form controls. Shortcuts work even when the overlay is hidden. Page controls run only in managed tabs on configured, permitted hosts.

After a browser restart or extension update, open the toolbar popup and select Start. Restart recovery is planned for a later release.

## How short intervals work

The visible page runs a timer and asks the extension service worker to advance when its deadline arrives. The worker validates the tab, deadline, pause state, and a unique schedule token. Duplicate or outdated requests cannot skip multiple pages.

A Chrome alarm acts as a recovery mechanism if the page cannot run its timer. The recovery alarm is scheduled no earlier than 30 seconds after scheduling, even during unpacked development, to avoid depending on Chrome's development-only exemption.

**Timing is best-effort.** Normal visible pages can request sub-30-second rotation. A stalled page, browser-internal page, PDF viewer, denied site access, minimized window, sleep, or heavy system load can delay it. Recovery may take 30 seconds or more. This is not a guarantee of exact timing on every website. See [timing design](docs/timing.md).

## Permissions and privacy

Website access is optional at installation. Saving or starting requests access to the exact HTTP/HTTPS hosts in your lineup. Chrome grants cover every path and port on each host; HTTP and HTTPS are separate, and subdomains are not automatically included. Declining a request preserves your edits and prevents starting with missing access. Removing a host from Settings and saving removes its unused grant. Revoking required access stops the display.

There is no broad `tabs` permission or static script on all websites. `scripting` loads the page timer and controls only in managed tabs on configured hosts; matching host grants let the extension read URLs to reuse tabs. `storage` keeps settings and cycle state locally; `alarms` provides recovery.

When updating from 0.2, reload the existing extension to preserve settings. Old broad website grants are removed on update/startup; the next Save or Start may ask you to approve the selected hosts again.

The extension does not send page contents or configuration to a project server. Websites you display still make their own network requests and follow their own privacy practices. See [privacy details](PRIVACY.md).

## Optional popup handler

The advanced Weather Underground handler remains a source-level option for first-run defaults. Existing popup rules are preserved when that site is edited or reordered in Settings. The current settings screen does not expose popup-rule editing. The site configuration is:

```js
popupRules: {
  enabled: true,
  handler: "wunderground-bx",
  retryForSeconds: 12,
  retryIntervalMs: 1000
}
```

This attempts known close buttons on a specific popup layout. It is not a general popup blocker, does not bypass logins or paywalls, and may stop working when the website changes. `tools/popup-inspector.js` is a manual developer helper, not part of the installed extension.

## Development

No build step or third-party runtime packages are required. With Node.js 20 or newer:

```sh
npm test
```

Tests cover timing requests, recovery, worker restarts, duplicate messages, pause/resume, tab removal and site identity, exact URL matching, keyboard behavior, content visibility, navigation-cache restoration, and reinjection. They do not replace real Chrome acceptance tests. See the [test checklist](docs/testing.md) and [contribution guide](CONTRIBUTING.md).

## Roadmap

1. Test the preview in real Chrome with representative dashboards, including a packaged build and long-running sessions.
2. Extend the settings screen with import/export.
3. Add icons, screenshots, accessibility checks, and operating-system deployment guides.
4. Publish the same open-source project as a reviewed Chrome Web Store extension.

Feedback and focused contributions are welcome. When reporting problems, include Chrome/OS versions, rotation interval, expected behavior, and a public reproduction URL when possible.

## License

MIT — see [LICENSE](LICENSE).
