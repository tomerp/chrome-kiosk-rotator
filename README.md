# Chrome Kiosk Rotator

Turn a Chrome window into a rotating display of your dashboards, status pages, and other websites.

Chrome Kiosk Rotator keeps one tab open per site and switches between them, so pages can retain their existing browser sessions. A compact green-on-black overlay shows the current page and time to the next switch.

**Status: community preview (0.1.0).** Install from source today. A settings interface and a Chrome Web Store release are planned; this version has not been submitted to the store. Browser and packaged-extension acceptance testing is still pending. Automated tests use simulated Chrome APIs and page environments.

## Features

- Configurable rotation interval, including an eight-second default.
- Reuse already open tabs when the full URL matches, or create new ones without replacing your current page.
- Arrow keys to switch; Space to pause or resume.
- Optional per-site refresh, performed while the tab is inactive.
- Optional Weather Underground popup-close handler, disabled in the public example.
- Start and stop with the extension toolbar button. Stopping leaves your tabs open.
- Local operation: no project backend, accounts, analytics, or remote extension code.

## Install the preview

1. Download this repository using **Code → Download ZIP**, then extract it, or clone it.
2. Edit `extension/config.js` with your website URLs and preferred timing.
3. Open `chrome://extensions` in Chrome 120 or newer.
4. Enable **Developer mode**, choose **Load unpacked**, and select the **extension** subfolder.
5. Pin Chrome Kiosk Rotator to the toolbar, then click its icon in the window you want to use.
6. Enter Chrome fullscreen using your operating system's normal fullscreen control.

The example configuration uses `example.com` and `example.org`, so it is safe to share. Replace them with useful pages before using your display.

This extension manages one rotation window at a time. It does not launch Chrome in kiosk mode, lock down the operating system, or prevent users from leaving fullscreen. Use a dedicated Chrome profile/window for an unattended display. Automatic launch, login and recovery after a reboot are separate deployment tasks.

## Configure

```js
globalThis.KIOSK_CONFIG = {
  rotationSeconds: 8,
  sites: [
    {
      url: "https://example.com/",
      label: "Dashboard",
      refreshEverySeconds: 0
    },
    {
      url: "https://example.org/",
      label: "Status",
      refreshEverySeconds: 300
    }
  ]
};
```

Use unique HTTP or HTTPS URLs. `rotationSeconds` accepts values from 1 through 86400. `refreshEverySeconds` is optional: zero means no forced reload. Refresh checks happen on tab transitions; they are not independent schedules and do not refresh the active page or a single-page cycle.

After editing configuration, reload the extension on `chrome://extensions`, then click its toolbar icon to start. Keep personal URLs, credentials, and private dashboard screenshots out of commits, issues, and shared ZIPs. Configuration is currently a source file; a settings screen is on the roadmap.

Existing tabs are reused only when the complete URL matches. After a cycle starts, a tab stays assigned to its configured site even if that site redirects it through login. A later start may create another tab if its URL has changed. The old substring-based `match` option is no longer used.

## Controls

| Control | Action |
| --- | --- |
| Toolbar icon | Start a cycle, or stop the existing cycle |
| Right / Left arrow | Next / previous page |
| Space | Pause / resume |
| Switch to a non-kiosk tab in the same window | Pause rotation |

Return to a kiosk tab and press Space to resume after switching away. Shortcuts do not intercept typing, text composition, modified key combinations, or focused links and form controls. Overlay and shortcuts are enabled only in tabs belonging to the running cycle.

After a browser restart or extension update, start the cycle again using the toolbar button. Restart recovery is planned for a later release.

## How short intervals work

The visible page runs a timer and asks the extension service worker to advance when its deadline arrives. The worker validates the tab, deadline, pause state, and a unique schedule token. Duplicate or outdated requests cannot skip multiple pages.

A Chrome alarm acts as a recovery mechanism if the page cannot run its timer. The recovery alarm is scheduled no earlier than 30 seconds after scheduling, even during unpacked development, to avoid depending on Chrome's development-only exemption.

**Timing is best-effort.** Normal visible pages can request sub-30-second rotation. A stalled page, browser-internal page, PDF viewer, denied site access, minimized window, sleep, or heavy system load can delay it. Recovery may take 30 seconds or more. This is not a guarantee of exact timing on every website. See [timing design](docs/timing.md).

## Permissions and privacy

This preview requests access to HTTP and HTTPS websites so users can configure arbitrary dashboards. A small content script loads on those pages and checks whether its tab is in the cycle; the overlay and page timer activate only for managed tabs. `tabs` supports tab discovery and switching, `scripting` initializes existing tabs, `storage` keeps local cycle state, and `alarms` provides recovery.

The extension does not send page contents or configuration to a project server. Websites you display still make their own network requests and follow their own privacy practices. See [privacy details](PRIVACY.md). Site-scoped optional permissions are planned before the store release.

## Optional popup handler

For Weather Underground only, add this to that site's configuration:

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
2. Add a settings screen for URLs, ordering, intervals, import/export, and overlay preferences.
3. Request access only to sites the user chooses and provide clear start/pause/stop status.
4. Add icons, screenshots, accessibility checks, and operating-system deployment guides.
5. Publish the same open-source project as a reviewed Chrome Web Store extension.

Feedback and focused contributions are welcome. When reporting problems, include Chrome/OS versions, rotation interval, expected behavior, and a public reproduction URL when possible.

## License

MIT — see [LICENSE](LICENSE).
