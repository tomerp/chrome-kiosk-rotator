# Acceptance testing

## Automated checks

Run `npm test` with Node.js 20+. These tests execute the real extension scripts with simulated Chrome APIs, clocks, and page objects. No third-party test packages are needed.

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

Before Chrome Web Store submission, also validate settings, optional site permissions, icons/screenshots, privacy disclosures, accessibility, and the final installation/update flow. These features and checks are not yet complete in 0.1.0.
