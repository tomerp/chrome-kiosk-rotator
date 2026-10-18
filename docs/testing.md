# Acceptance testing

## Automated checks

Run `npm test` with Node.js 20+. These tests execute the real extension scripts with simulated Chrome APIs, clocks, and page objects. No third-party test packages are needed.

## Settings screen checks completed

- 32 automated tests pass, including saved configuration, worker/browser restart persistence, revised page order/timing/refresh, save while running, invalid input, concurrent saves, unauthorized senders, and storage failures.
- Chrome UI harness checks passed for adding a page, removing a page, both reorder directions, rotation edits, seconds/minutes/hours selection, save/reload persistence, and duplicate URL rejection. The harness uses the real options HTML/CSS/JavaScript with a simulated extension API and browser-local test storage; it does not establish that installation or rotation works in Chrome.
- The browser automation environment blocks `chrome://extensions`, so loading and testing the installed extension requires a user handoff. No browser protections were changed.

## Installed settings acceptance — pending

- Load the `extension/` folder as a separate unpacked extension, or reload this public project's existing installation.
- Confirm Options opens on first install. Access it again using the extension's right-click → Options menu.
- Save three public pages in a new order, set a short rotation interval, and choose a refresh interval.
- Close and reopen Options; verify the saved values. Start display and confirm page order, countdown, and off-screen refresh.
- Edit settings during an active cycle. Save; confirm rotation stops, tabs stay open, and Start display uses the new list.
- Open Options in two tabs and verify stale edits are rejected without overwriting the newer save.
- Reload the extension and restart Chrome; verify settings persist while the cycle requires a new Start.

## Real Chrome checklist — pending

Use a separate test Chrome profile. Do not replace a working kiosk installation for this evaluation. Close the extension service worker inspector during timing and endurance tests because inspecting a worker can change its lifetime.

- Load the `extension/` directory and confirm no extension errors.
- Start on an unrelated page: preserve it, open/reuse the two example pages, and show one overlay per managed tab.
- Observe at least ten eight-second transitions. Measure actual activation times; do not rely only on the countdown.
- Verify Left/Right, Space, toolbar stop/restart, and a single-page configuration.
- Verify typing in inputs, textareas, editable content, shadow-DOM fields, and keyboard-operated form controls.
- Close the first, middle, last, and active tab. Confirm labels and refresh rules stay attached to their original sites.
- Test a dashboard behind login, redirects, reloads, back/forward navigation, and navigation to a different website within a managed tab.
- Test a page loaded before extension installation and reinjection after starting.
- Pause and manually select tabs. Choose an unrelated tab and confirm the extension does not steal focus.
- Test sleep/wake, minimized windows, browser restart, worker termination, failed loads, restricted pages, and denied website access. Confirm recovery is slower but does not repeatedly skip pages.
- Test per-site refresh on an inactive tab and verify the visible page is never force-reloaded by the refresh feature.
- Run overnight with representative dashboards and watch resource use and session expiry.

## Packaged distribution — pending

Repeat short-interval and recovery tests with a packaged installation in a supported test distribution environment. Unpacked loading alone cannot prove packaged-alarm behavior. Chrome may restrict local packaged installs depending on the platform and management policy; use an approved store testing channel or managed test environment, without weakening browser protections.

Before Chrome Web Store submission, also validate settings, optional site permissions, icons/screenshots, privacy disclosures, accessibility, and the final installation/update flow. The settings screen is implemented; the remaining features and installed-browser checks are not yet complete in 0.2.0.
