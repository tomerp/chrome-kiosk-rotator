# Artwork sources and provenance

The icon and promotional images are original geometric vector artwork in `assets/`. They use the extension's dark green, mint, and off-white palette; no Google logo or third-party artwork is used. PNG exports are included in `extension/icons/` and `store/images/`.

The 128px icon has a 96px square artwork area with 16px transparent padding. Small toolbar icons use a tighter crop for legibility. PNG assets were rendered from the SVG sources using Sharp; no generated raster artwork or external image service is required.

## Screenshot method

Captured in Chrome at 1280×800 from the actual 0.3.1 Settings/popup HTML, CSS, and JavaScript. A local-only API fixture (`preview-api.js`) supplies public example configuration; it does not run a real installed extension or request real website permissions. No visual changes were applied to the Settings UI. The toolbar screenshot places the real popup inside an explanatory composition (`toolbar-showcase.html`).

The website URLs are example.com and example.org. “Team dashboard” and “Service status” are sample labels, not claims about those websites. The fixture's running state demonstrates the popup appearance and is not evidence of rotation working. Store-installed behavior and timing must still be tested independently.

To reproduce: copy `extension/` to a disposable preview directory, copy the fixture files into that directory, and insert `<script src="preview-api.js"></script>` before the core.js script in its options.html and popup.html. Serve that directory on localhost. Open settings-showcase.html for the settings view, settings-showcase.html?lineup for the lineup view, and toolbar-showcase.html for the popup composition. The settings wrapper preserves the viewport dimensions while its iframe scrolls the real options page. Use a 1280×800 browser viewport and capture PNGs. Keep fixture scripts and showcase HTML out of the actual extension directory and upload ZIP.

The first Settings image shows timing/overlay controls. The second is scrolled down to show the lineup and save/start controls. Images are RGB PNGs, square-cornered and full bleed. The optional 1400×560 marquee and required 440×280 small promo are separate from the three UI screenshots.
