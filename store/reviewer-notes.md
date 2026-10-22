# Reviewer instructions

Kiosk Rotator rotates user-selected website tabs. No extension account, payment, login, or external API key is needed. Public default URLs are supplied so all core functionality can be reviewed without private dashboards.

1. Install the submitted extension. Settings opens on first installation. It is also accessible from the toolbar popup's Settings button.
2. Keep https://example.com/ and https://example.org/ in the lineup. The default rotation interval is eight seconds.
3. Select Start display. Approve the optional access request for the two configured hosts.
4. Observe the two tabs switching. Each page retains its own tab. Existing tabs are reused when their complete URLs match.
5. Open the toolbar popup. Pause and Resume the display, then Stop. Stop leaves the tabs open.
6. In Settings, uncheck Show countdown overlay, then Save settings and Start display. Rotation continues without the bar. Left/Right and Space still work on focused display pages, except when typing or using form controls.
7. Reorder the pages, set a different rotation interval, and save. Saving stops a running display. Start again to use the new lineup.
8. Set a page refresh interval to 10 seconds. With two pages rotating, reloads are checked at transitions and occur only while the page is inactive. A single-page cycle does not auto-refresh.
9. Close and reopen Settings to verify local persistence. Browser restart or extension update retains settings but requires a new Start.

No remote extension code is used. The wildcard host patterns are optional declarations supporting arbitrary user-entered websites; each runtime request is narrowed to configured scheme/host combinations. Static all-site content scripts and the broad tabs permission are not used.

The foreground page timer supports short intervals. A recovery alarm is deliberately scheduled at least 30 seconds out; sleep, page freezes, browser restrictions, or missing script execution may make recovery slower. This is not a locked-down operating-system kiosk or automatic browser-launch service.

The legacy Weather Underground popup-close handler is disabled in the public defaults and has no current UI toggle. It is included for source configuration compatibility and is not required for normal rotation.

Source: https://github.com/tomerp/chrome-kiosk-rotator
Privacy: https://github.com/tomerp/chrome-kiosk-rotator/blob/main/PRIVACY.md
