# Timing design

## Requirement

Keep loaded pages in separate tabs and rotate on short intervals such as eight seconds, including when distributed as a Manifest V3 extension. Browser timers remain best-effort; exact deadlines cannot be promised under sleep, freezing, page stalls, or system load.

## Alternatives evaluated

| Approach | Benefit | Limitation | Decision |
| --- | --- | --- | --- |
| Chrome alarms alone | Managed by Chrome and wakes a dormant worker | Packaged extensions cannot fire an alarm earlier than 30 seconds; unpacked installs hide this limitation | Recovery only |
| `setTimeout` in the service worker | Simple and independent of the displayed page | In-memory timers disappear when the worker terminates | Not the primary timer |
| Timer in the visible page | Supports short intervals without keeping a background worker alive artificially | Can stall or become unavailable on restricted, frozen, or inaccessible pages | Primary timer |
| Offscreen document | Has a separate document context | Requires a supported purpose and justification; does not provide a general guarantee of unthrottled timing | Not used as a timer-only workaround |
| Native companion or managed kiosk software | Can provide independent orchestration | Adds another installation and platform-specific maintenance | Outside this lightweight extension's current scope |

## Current implementation

1. The worker stores a deadline and random token with cycle state.
2. Only the active, visible managed page schedules a timer for that deadline.
3. When due, the page sends its token to the worker.
4. The worker serializes transitions and validates the sender's tab, top frame, active state, pause state, token, and deadline before switching.
5. A new deadline/token is persisted before the next tab activates. Delayed old messages become harmless.
6. A one-shot alarm is also scheduled for `max(deadline, now + 30 seconds)` as recovery. It consults current state before advancing.

State lives in local extension storage, so worker termination does not lose the deadline. A full browser restart clears the running cycle because tab IDs belong to the browser session. A user must start again.

Closing a tab preserves each remaining tab's original site index and refresh timestamp. Choosing an unrelated tab pauses rotation instead of pulling focus back.

## Limits and validation

Automated simulations exercise the eight-second path, alarm recovery, worker reinitialization, races, visibility, and stale messages. These are not measurements of Chrome's runtime behavior. Before store submission, run the real-browser and packaged-build checks in [testing.md](testing.md), with the service worker inspector closed.

## Primary references

- [Chrome alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms): 30-second packaged minimum, unpacked exemption, and arbitrary additional delays.
- [Extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle): worker shutdown and persisted state.
- [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts): isolated page execution and runtime messaging.
- [Timer throttling](https://developer.chrome.com/blog/timer-throttling-in-chrome-88): visible versus hidden page timers.
- [Offscreen API](https://developer.chrome.com/docs/extensions/reference/api/offscreen): supported reasons and runtime-only extension API access.
