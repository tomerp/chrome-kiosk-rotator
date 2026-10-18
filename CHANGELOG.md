# Changelog

## 0.2.0 — Settings screen

- Add, remove, rename, and reorder pages through a full-page options screen.
- Set rotation timing and per-page refresh in seconds, minutes, or hours.
- Save settings locally; preserve them through worker/browser restarts and extension updates.
- Stop the current cycle before applying saved changes; start the saved lineup from Settings.
- Validate inputs, preserve unsaved edits on errors, and reject stale concurrent saves.
- Open settings on first install; retain bundled configuration as first-run defaults.
- 32 automated tests pass. Chrome UI harness checks passed for adding, deleting, reordering, save/reload, refresh units, and duplicate rejection. Installed-extension acceptance testing remains pending.

## 0.1.0 — Community preview

- Public example configuration and rewritten installation/privacy documentation.
- Visible-page rotation timer with a 30-second-or-later alarm recovery path.
- Persisted schedule tokens and serialized transitions to reject duplicate or stale requests.
- Correct initial countdown state and stable site identity after tabs close.
- Keyboard controls that respect typing, composition, modified keys, and interactive controls.
- Start/stop toolbar action; starting preserves the user's existing page.
- Pause when switching away from kiosk tabs, and clear cycle state on browser restart.
- Exact URL matching when reusing existing tabs.
- Automated regression tests; real-browser and packaged acceptance testing pending.
