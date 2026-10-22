# Submission checklist — 0.3.1

## Files
- Upload ONLY `kiosk-rotator-0.3.1.zip` using Add new item. It contains manifest.json at its root.
- Do NOT upload the whole submission-kit ZIP as extension code.
- Store icon: `store-icon-128.png`.
- Required small promo image: `promo-small-440x280.png`.
- Optional marquee: `promo-marquee-1400x560.png`.
- Screenshots: the three `screenshot-*.png` files, all 1280×800. Suggested order: toolbar, settings, pages.
- `icon-preview-512.png` is a review preview, not the requested 128px store icon.

## Prepared
- [x] Display name changed to Kiosk Rotator; existing folder/repository names retained.
- [x] Original icon added at 16, 32, 48 and 128 pixels; toolbar, Settings, and popup use it.
- [x] Listing text, permission justifications, privacy policy, and reviewer instructions prepared.
- [x] No private dashboard URLs included in the package or artwork.
- [x] Source-controlled artwork and screenshot fixture provenance provided.
- [x] Owner confirmed 0.3.0 rotation, site permission approval, and hidden overlay working in Chrome.

## Before submission — publisher action / acceptance pending
- [ ] Complete developer registration, pay the registration fee, and enable two-step verification.
- [ ] Finish overnight rotation test. Note stalls, skipped pages, reload behavior, and session expiry.
- [ ] Reload 0.3.1 after the overnight test; confirm the new name/icon and retained settings.
- [ ] Verify Pause/Resume/Stop and settings save/reopen in installed Chrome.
- [ ] Verify denied/revoked access, managed page reload, browser restart, and refresh behavior.
- [ ] Review listing screenshots against the installed build. These show the actual shipped HTML/CSS/JS with public example configuration through a local API fixture; they are not evidence of store installation or approval. The toolbar image adds explanatory framing around the real popup UI.
- [ ] Check the live privacy/support links and complete the dashboard fields with the included text.
- [ ] Review and make the dashboard's data-use certifications.
- [ ] Select Unlisted for the initial release. All visibility modes still require review.
- [ ] Submit for review only after resolving test failures; no submission was made while preparing this kit.

## After approval
- [ ] Install using the unlisted store link in a separate test profile.
- [ ] Test short rotation and recovery with the store-distributed build; unpacked testing is not sufficient.
- [ ] A store installation has a different extension identity from the local unpacked copy. Existing local settings do not automatically transfer. Re-enter the lineup in the test/store copy; do not remove your working unpacked installation until it is no longer needed.
- [ ] Switch visibility to Public when acceptance is complete, add the store link to GitHub, and begin promotion.

## Current limits to communicate
One window at a time; no automatic start after browser restart; no operating-system lockdown; timing is best-effort; inactive-page refresh is checked on transitions, not an independent schedule; single-page displays do not auto-refresh.

## Official references
- Images: https://developer.chrome.com/docs/webstore/images
- Listing: https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- Privacy: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- Branding: https://developer.chrome.com/docs/webstore/branding
- Publishing: https://developer.chrome.com/docs/webstore/publish
- Distribution: https://developer.chrome.com/docs/webstore/cws-dashboard-distribution
