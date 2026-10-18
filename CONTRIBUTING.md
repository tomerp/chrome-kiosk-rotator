# Contributing

Small, focused improvements and reproducible bug reports are welcome.

1. Open an issue for substantial behavior changes so the intended scope is clear.
2. Fork the repository, make a focused change, and run `npm test` with Node.js 20+.
3. For runtime or UI changes, also test in a separate Chrome profile using [the acceptance checklist](docs/testing.md).
4. Submit a pull request describing the problem, resulting behavior, and checks you actually completed.

Keep the extension dependency-free where practical. Use public example URLs, preserve the distinction between normal short timers and slower recovery, and avoid artificial worker keepalive tricks. Do not include credentials, personal configuration, private page screenshots, or sensitive console output.

The current priority is validating the preview, followed by a settings interface and optional site permissions for Chrome Web Store distribution.
