# Privacy practices — copy-and-paste text

These answers describe the submitted 0.3.1 code, including local processing. Review the actual dashboard wording before certifying it. No account credentials or developer-specific contact information is supplied here.

## Single purpose
Rotate a user-selected lineup of website tabs in one browser window for dashboard and kiosk displays, with configurable timing, inactive-page refresh, and display controls.

## Permission: alarms
Provides a recovery timer when the visible page cannot request its next rotation. This lets the extension continue its user-configured display sequence after page stalls or service-worker inactivity. It does not schedule unrelated background activity. The recovery alarm is scheduled no earlier than 30 seconds after scheduling; exact timing is not guaranteed.

## Permission: storage
Saves the user's chosen website URLs, labels, page order, rotation interval, refresh intervals, and overlay preference in local extension storage. It also stores the current cycle's tab/window identifiers, active page, pause state, and timing metadata so the service worker can resume its work. Data is not synced or sent to a developer-operated service.

## Permission: scripting
Injects bundled page controls and the foreground rotation timer into managed tabs on configured, permitted hosts. These scripts implement keyboard shortcuts and the optional countdown overlay. Hiding the overlay leaves the timer and shortcuts active. A legacy, opt-in Weather Underground handler can inspect known popup elements and activate their close button; it is disabled in the public defaults.

## Optional host permissions: http://*/* and https://*/*
Users may choose arbitrary HTTP or HTTPS dashboard hosts. The wildcard patterns are declarations of optional eligibility, not a request for all-sites access at installation. On Save or Start, the extension requests only each configured scheme and exact hostname, without a subdomain wildcard. Chrome host grants cover all paths and ports on that host. Grants let the extension read matching tab URLs to reuse the configured pages and inject the bundled timer and controls into managed tabs. Unused host grants are removed when the user saves a reduced lineup. Required access being revoked stops rotation.

## Remote code
No, the extension does not execute remotely hosted code. All extension logic is bundled in the submitted ZIP. The ordinary websites displayed in tabs load their own content independently; their code is not imported as extension logic.

## Data-use categories
Disclose local handling rather than claiming that the extension handles no data. For the current dashboard categories, use these explanations:

- Web history: configured website URLs and matching tab URLs are used locally to identify and rotate the chosen pages. The extension does not build a general browsing-history database or transmit URLs to the developer.
- User activity: the extension processes its display-control commands and stores local active-page, pause, and rotation/refresh timing state. It does not log arbitrary keystrokes, mouse activity, or page interactions.
- Website content: user-provided page labels are stored locally. If the legacy optional popup handler is enabled, it inspects known page elements to find a close button. Page contents are not harvested, stored, or sent to the developer.

Do not select personally identifiable information, health information, financial/payment information, authentication information, personal communications, or location as data the extension intentionally collects. Users can enter URLs or labels containing private information; warn them to avoid passwords/tokens in configuration and public support requests. The extension does not read login cookies or manage credentials.

## Data-use certifications
The release supports these statements:
- Data is not sold or transferred to third parties by the extension.
- Data is used only for the extension's disclosed display functionality, not advertising or unrelated purposes.
- Data is not used to determine creditworthiness or for lending.

The publisher must read and make the dashboard's certifications themselves. Displayed websites and GitHub support requests are separate services with their own privacy practices.

## Privacy policy URL
https://github.com/tomerp/chrome-kiosk-rotator/blob/main/PRIVACY.md

## Source guidance
Checked 2026-10-21:
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq (local processing must also be disclosed)
