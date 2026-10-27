> Historical 9 × 9 interaction audit. Current 8 × 8, Flow, themes and non-blocking burst behavior supersede its Classic-only rules, save keys, cell counts and input lock. See [VERIFICATION.md](VERIFICATION.md) and [WORKFLOW.md](WORKFLOW.md). Results below describe the earlier revision only.

# Interaction and clear-effect improvements

This is a new audit of the existing implementation, following `development-prompt/DEVELOPMENT_PROMPT.md` and the owner's later release-coordinate/performance requirements. It supersedes the previous report's drag and visual verification details without rewriting historical test results.

## Baseline and findings

Baseline on Node 24.21.0 / npm 11.19.0: **67 tests passed**, lint passed, production build passed. No applicable AGENTS.md was found in the project or inspected ancestor paths. The existing React/Vite structure, dependencies, lockfile, engine rules, 25-shape catalogue, RNG, and save schema were retained.

| Classification / severity | Reproduction and expected versus actual | Root cause / affected code | Fix |
|---|---|---|---|
| Confirmed defect / high | Start a 2 × 2 drag with a centre grip; send a move at (74.5, 230.5), then release at (140.5, 197.5). Expected anchor (2,3); old code submitted (3,1). | `usePieceDrag`: pointer-up read `active.last`, ignoring release coordinates. The former regression test incorrectly required the old candidate. | Release now synchronously refreshes geometry and calls the shared calculation with pointer-up coordinates. It cancels the pending frame and clears capture ownership before dispatch. |
| Confirmed defect / medium | Deliver ResizeObserver's initial/unchanged notification after pickup. Expected the gesture to continue; the old hook always called the cancellation callback. | `useBoardGeometry`: every observer/scroll/resize notification unconditionally invalidated interaction. | Compare actual geometry; ignore unchanged notifications, cancel actual changes, and check again synchronously on release before observer delivery. |
| Confirmed coordinate defect / medium | A 300 px logical grid is scaled to 600 px with 3 px logical gaps. Expected 6 px screen-coordinate gaps; old measurement returned 3 px, mixing units. | `readGridGeometry`: client rectangles include CSS scaling, computed gaps did not. | Scale computed gaps by measured/logical dimensions before deriving cell size and pitch. A real-browser scaled-grid regression is included but not executed here. |
| Confirmed hot-path overhead / medium | Run 40 distinct pointer events inside one snapped anchor under the isolated StrictMode hook profiler. Old hook committed React 40 times. This proves update overhead, not perceptible lag or a frame rate. | `usePieceDrag` stored every floating coordinate in React; DragOverlay used left/top. Board rebuilt all cell elements with new event handlers for each update. | Latest coordinates stay in refs; at most one RAF is pending. Position uses translate3d directly. React changes only for candidate/validity/lifecycle changes. Stable cell props and grid event delegation allow unchanged cells to skip rendering. |
| Correctness hardening / low | Invalid sound names or unexpected JavaScript errors could be swallowed by broad optional-audio catches. This is a diagnostic concern, not a demonstrated normal-play failure. | `useGameAudio` broad catches and anonymous empty rejection handlers. | Unknown sound names throw; only named, expected browser/device DOMExceptions are absorbed. Paused nodes disconnect immediately. |
| Requested enhancement | Old clears faded tiles and showed score text, with no burst particles. | FeedbackLayer and CSS presentation. | One deterministic shard per unique cleared cell (at most 81), local clipping, transform/opacity animation, brief brightening, and a 360 ms token-scoped presentation lifetime. |

Suspected but **not established**: device-specific dropped frames, native touch jank, audio quality, browser-specific focus/scroll behavior, and memory growth under sustained real-browser play. Screenshots/unit timings cannot prove these. The browser/performance environment is blocked below.

## Rules and algorithms

No gameplay-rule changes. Engine, reducer, catalogue, generator, and storage modules remain unchanged. Exact scoring is still `10P + 100L + 50L(L−1)`. Existing engine tests retain the 310-point/17-cell crossing clear, 320-point/18-cell two-row domino, non-clearing 3 × 3 regions, stable slots, third-piece refill, cleared-board/refill-aware game over, duplicate/stale rejection, immutability, and saved RNG continuation.

The new particles read immutable after-placement snapshots and deduplicated clear coordinates. They do not sample RNG or write game state. Intersections produce one shard. Reduced motion creates no particle nodes. Accepted results save immediately; a new integration regression checks that the saved board is already cleared while the visible placed snapshot/particles still exist.

## Movement and lifecycle

- At gesture start, measure source grip and inner board once. Use client coordinates and fractional grip consistently; touch gets a 48 px upward lift.
- Pointer moves only replace the latest ref coordinates and request a frame if none is queued. A frame calculates one candidate, writes a transform, and updates React only when the anchor/validity changes. No per-frame layout reads.
- A portal callback applies the latest ref transform when the overlay mounts, preventing a jump to its origin or an older frame's coordinates.
- Pointer-up cancels the frame, refreshes current geometry, cancels a geometrically invalidated gesture, and computes from the release event synchronously. It proposes one guarded placement. Capture ownership is cleared before releasing native capture, preventing lost-capture delivery from cancelling an accepted move.
- Invalid release returns via a separate 150 ms transform/opacity animation. Live tracking has no easing, interpolation, or position transitions. Reduced motion returns immediately.
- Cancel clears capture, frames, return timer/animation, transient preview, and will-change. Old frame/return callbacks check gesture identity and cannot restore cancelled UI or affect a new game.
- Grid events are delegated; memoization is limited to the 81-cell hot path with primitive props. Keyboard and select-then-place tests still exercise the shared validator and command.
- Invalid text means “Doesn’t fit here,” rather than claiming the piece cannot fit anywhere. The whole board no longer changes its frame colour while hovering invalid positions. The tray explicitly says “Use all 3 pieces to refill.”

## Measured results and verification

The isolated jsdom/React Profiler comparison uses the same 2 × 2 centre-grip, same-anchor movement:

- Original hook: **40 React commits for 40 pointer moves**.
- Updated hook, after first preview: **0 additional commits for 40 same-anchor moves**, even with a paint after every move; the DOM transform still changes.
- A burst of 40 moves before paint queues exactly **one** frame.
- Measurements occur at pickup/release; same-anchor frame updates do not read layout.

This measures React update behavior in Node/jsdom. It does **not** establish 60 FPS, 16.7 ms frame delivery, GPU composition, real-device latency, or production-browser performance.

Final checks completed after formatting and scope review:

| Command/check | Result |
|---|---|
| `npm run test:run` | **88 passed in 10 files**, including StrictMode, latest release, pending-frame cancellation, saved crossing clears, reduced motion, and audio cleanup. |
| `npm run lint` | Passed; no lint settings were weakened or changed. |
| `npm run build` | Passed; static production output generated. |
| `npm run test:browser -- --list` | **17 cases discovered in 2 files**; discovery only. |
| `npm run test:browser` | Attempted; preview cannot bind its socket in the sandbox, so no browser cases executed. |
| Development server / installed Chromium | Both attempted; blocked by `EPERM`/browser sandbox `Operation not permitted`. Connected browser inventory also returned no browser. |
| Final scope review | Engine, RNG, shapes, reducer, storage, package files/lock, and lint configuration verified byte-identical to the pre-edit snapshot. Temporary baseline measurement source was removed; no new dependencies. |

 The maintained browser suite includes release-event-coordinate, CSS-scaled/fractional geometry, burst intersection, mobile/desktop/landscape, scroll-offset, cancellation, and existing emulated-touch cases. See [PERFORMANCE.md](PERFORMANCE.md) for the repeatable browser recording.

## Environment limits

A fresh development-server attempt fails with `listen EPERM` on 127.0.0.1:5173. An independent installed Chromium launch terminates at `sandbox_host_linux.cc` with `Operation not permitted`. Browser screenshots, live console/network inspection, native touch/audio, browser frame timing, dropped frames, and memory/listener trends therefore remain unverified. No browser frame-rate claim is made. Test discovery is not test execution.

Launch outside the restricted execution sandbox:

```bash
npm ci
npm run dev
```

Use the actual Vite Local URL (normally http://localhost:5173/), and Ctrl+C to stop. Existing locks require Node 24.15+ in the 24.x line or Node 26+, and npm 11+.

```bash
npm run test:run
npm run lint
npm run build
npm run preview
npm run test:browser
```

The browser suite uses the production preview on http://127.0.0.1:4173/, or an existing server supplied through `PRISM_URL`.
