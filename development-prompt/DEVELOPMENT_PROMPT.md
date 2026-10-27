# Build and verify Prism Nine

Act as a senior React engineer, game designer, UI/UX designer, gameplay engineer, accessibility engineer, and QA engineer. Build or finish **Prism Nine**, a polished, colourful **9 × 9 block puzzle**. Deliver the working source, connected gameplay, tests, a static production build, and accurate run instructions.

Do the implementation and verification. A plan, mockup, component skeleton, disconnected interface, or list of suggestions is not a completed deliverable. Inspect existing work, retain sound implementations, fix defects, and carry the complete playable experience through verification.

## 1. Confirmed requirements and explicit assumptions

Confirmed decisions:

- React.js with JavaScript/JSX; Vite for a new project.
- Exactly **9 rows and 9 columns**, regardless of board dimensions in references.
- Responsive browser play on phones, tablets, desktops, and short landscape screens.
- Original Prism Nine branding, icons, and interface assets.
- Dark navy/purple neon styling, saturated seven-colour pieces, readable tile depth, and distinct tray slots.
- Classic **untimed** gameplay with one mode and three available pieces.
- Full horizontal rows and vertical columns clear; **3 × 3 regions alone do not clear**.
- Exact scoring defined below, visible move feedback, and locally saved best score/progress.
- No player rotation, undo, hints, hold, power-ups, or difficulty ramp in version one.
- Sound with mute, pause, confirmed restart, reduced motion, and an accessible alternative to dragging.
- A personal playable project with no accounts, backend, or external services.

Implementation assumptions: internal Home/Game screen state; localStorage persistence; native Pointer Events; optional quiet synthesized Web Audio effects; system sans-serif fonts; plain CSS/CSS Modules. Keep these unless the existing repository requires an equivalent compatible implementation. Make routine implementation decisions without a broad questionnaire. Report a material contradiction rather than silently changing gameplay.

The 8 × 8 size sometimes suggested in an earlier generic prompt was a proposal; **9 × 9 is the agreed requirement for this game**.

## 2. Inspect the repository and references first

If a repository exists, read applicable instructions, package.json, lockfile, source, styling, tests, and scripts. Use its package manager and existing React/Vite structure. Do not scaffold over it, replace its framework unnecessarily, delete user work, or upgrade dependencies without a concrete reason. Verify actual behavior rather than assuming a previous implementation or report is correct.

Inspect every supplied reference image directly if available. Separate:

1. Details actually visible in that image.
2. Reasonable visual interpretations.
3. Behaviors the image cannot establish.

If images are missing or unclear, disclose that and continue using this written specification. Do not claim missing images were inspected or that proposed hex values were sampled from them.

The owner's prior written descriptions report:

- Reference 1: warm wood textures, 10 × 10 grid, cream/golden bevelled blocks, bold numbers, crown/pause, a horizontal meter, lower icon counters, three shapes, stars, and a “+100” overlay.
- Reference 2: navy/purple arcade interface in a phone mockup, 8 × 8 grid, saturated multicoloured blocks, large numbers, crown/back/settings, a meter, three shapes, HOLD area, and a raised orange L piece.

These descriptions guide the design; they are not evidence for gameplay rules. Use reference 2's atmosphere with reference 1's tile readability and tray separation. Do not copy a phone bezel, proprietary wordmark, TETRIS label, or unexplained meters/counters/HOLD controls.

## 3. Concrete visual specification

Use these chosen design tokens; they are proposals from the owner, not sampled pixels:

| Role | Colour |
|---|---|
| Page background | #080D27 |
| Gradient endpoint | #171044 |
| Panel | #111A3A |
| Empty cell | #172242 |
| Base cell boundary | #3C4B78 |
| Primary text | #F3F6FF |
| Secondary text | #B8C4E5 |
| Interface accent | #9C78FF |
| Cyan / purple / orange pieces | #2DD4E7 / #A855F7 / #FF9B3D |
| Pink / blue / green / yellow pieces | #F55370 / #4388FF / #72D94C / #FFD34D |

Use subtle static radial glows or a background grid. Give tiles slightly rounded corners, light upper edges, darker lower edges, and restrained highlights/shadows. Preserve visible grid boundaries; strengthen boundary/focus colours where needed to meet contrast. Each piece's occupied cells share one colour. Colour is decorative, never a gameplay rule.

Use system sans-serif typography, explicit **Score** and **Best** labels, bold tabular score numerals, approximately 30–40 px current score, and 16–20 px best score. Do not hide control meaning behind unfamiliar icons.

Centre a container with maximum width about 560 CSS px. Cap the square board's outer width at 480 px. Use about 16 px phone gutters and safe-area insets. Give the board frame about 10 px padding and 16 px outer radius; use about 3 px cell gaps. The measurable inner grid has **no padding or border**. Reserve three stable tray slots beneath the board, even after individual pieces are used. Tray cells may be smaller; floating dragged pieces use board-scale cells.

Support 320 px width without horizontal page overflow. On short screens, allow scrolling instead of making every control tiny. Keep toolbar/dialog targets at least 44 × 44 px. Target 4.5:1 ordinary text contrast and 3:1 large text/essential controls. Provide visible focus and non-colour validity feedback.

Timing targets: buttons 80–120 ms; pickup about 100 ms; placement 100–140 ms; clearing 180–240 ms; score display count-up 200–350 ms; invalid return 120–180 ms. Overlap effects so normal resolution locks input for less than about 450 ms. Reduced motion removes particles, shaking, and scaling, while preserving understandable results through immediate updates or brief fades. Particles are optional and bounded, never required for gameplay.

## 4. Complete screens

**Home:** title, short tagline, best score, New Game, Help, Settings. Show Continue only for a validated active saved game. Confirm before New Game replaces active progress. A finished game may show its last score but does not offer Continue.

**Game:** Home, Score, Best, Pause, Settings, exactly 81 board cells, three tray slots, contextual instructions, and contextual Place/Cancel controls for non-drag play. Initial instruction text: **“Place blocks. Fill rows or columns. Keep space for the next pieces.”** Remember first-time instruction dismissal.

**Pause:** Resume, Restart, Home. Cancel uncommitted interaction, expose the final committed board if presentation is running, block board input, and suspend sound. Pause has no scoring effect in an untimed game.

**Settings:** Sound On/Off, default On; Motion Auto/Reduced, default Auto. Auto respects the operating system's reduced-motion preference. Preferences persist independently of a game.

**Help:** explain mouse/touch/keyboard controls, the bounding-box anchor, refill only after all three pieces, rows/columns, simultaneous clearing, exact scoring, no rotation, and game over. Explicitly state **3 × 3 regions do not clear**.

**Restart confirmation:** confirm replacing an active game and explain that best/settings are preserved. Cancelling returns to the appropriate previous screen/modal.

**Game over:** keep the final board visible behind a readable overlay; explain **“No remaining pieces fit.”** Show final score, best, and a new-record message when appropriate. Provide Play Again and Home. Play Again after game over needs no additional restart confirmation.

Dialogs must block underlying input, have accessible names/descriptions, trap/manage focus, close correctly, and restore focus where possible. Escape closes dismissible dialogs; the game-over result remains controlled by its explicit actions. Home always preserves committed progress.

## 5. Exact gameplay rules

1. A new game starts with an empty 9 × 9 board, zero score, and three generated pieces.
2. Players may use pieces in any order. Pieces retain their generated orientation.
3. Each occupied shape coordinate must map to an empty, in-bounds board cell. No overlap or partial off-board placement is allowed.
4. Accepting a move consumes exactly one piece. Unused pieces retain their original slots, IDs, orientation, and colour.
5. Consumed slots remain empty. Refill all three slots only when all three current pieces are consumed.
6. Detect every complete row and column against the **same intermediate board after placement**. Clear their union simultaneously; intersections clear once.
7. No gravity, cascade, automatic movement, timer, 3 × 3-region clearing, combo, streak, multiplier, or hidden reward exists.
8. Invalid drops and stale/duplicate actions do not change board, tray, score, best, counters, RNG, revision, or stable saved progress.
9. Check game over **after placement, clearing, and any required refill**. End only if none of the remaining available pieces has a legal anchor anywhere. One blocked piece is not enough if another fits.
10. Random generation may legitimately produce an unplayable tray. Do not secretly rescue, reroll, or weight pieces toward fitting.

## 6. Exact scoring

Let P = placed occupied cells, R = completed rows, C = completed columns, and L = R + C.

- Placement: `10 × P`.
- Lines: `100 × L`.
- Multi-line bonus: `50 × L × (L − 1)`.
- Entire move: **`10P + 100L + 50L(L − 1)`**.

The bonus awards 100 points per unordered pair of lines completed by this placement. It counts **completed lines**, not unique cleared cells. No separate per-cleared-cell reward exists. Placed cells earn placement points even if immediately cleared.

| Example | Placement | Lines | Bonus | Total |
|---|---:|---:|---:|---:|
| Four cells, no line | 40 | 0 | 0 | 40 |
| Four cells, one line | 40 | 100 | 0 | 140 |
| Two cells, two lines | 20 | 200 | 100 | 320 |
| One cell completing a row and column | 10 | 200 | 100 | 310 |
| Five cells, three lines | 50 | 300 | 300 | 650 |

Unique cleared cells = **`9R + 9C − RC`**. One row crossing one column removes 17 cells and counts as two lines.

Award and display the total once. A bonus label explains an included portion of that total; it must not award another bonus. Update profile best inside the same accepted move transition. Store startingBestScore when a game begins, preserve it on restore, and identify a new record by `score > startingBestScore`. Score count-up is presentation only and never updates engine values.

## 7. Board, catalogue, and generation

Represent the board as nine arrays of nine cells. A cell is null or an allowed colour ID. Occupancy means `cell !== null`, including colour ID zero. Rows increase downward, columns rightward; top-left is (0,0), bottom-right (8,8).

Represent shapes as integer `[rowOffset,columnOffset]` coordinates. Normalize minimum row and column to zero, then sort by row and column. The placement anchor is the top-left of the normalized bounding box; that corner may be empty. Validate actual occupied cells, never only the bounding rectangle or anchor occupancy.

Use exactly **25 distinct, connected shapes**, with stable IDs:

| Stable IDs | Family | Definition |
|---|---|---|
| 0 | Single | (0,0) |
| 1–4 | Horizontal bars | lengths 2, 3, 4, 5 |
| 5–8 | Vertical bars | lengths 2, 3, 4, 5 |
| 9–10 | Squares | full 2 × 2 and 3 × 3 |
| 11–12 | Rectangles | full 2-row × 3-column and 3-row × 2-column |
| 13–16 | Small L | base (0,0), (1,0), (1,1); four orientations |
| 17–20 | T | base (0,0), (0,1), (0,2), (1,1); four orientations |
| 21–24 | Long L | base (0,0), (1,0), (2,0), (2,1); four orientations |

Generate orientations by `(r,c) → (c,−r)` applied zero through three times, normalizing each result. Test catalogue uniqueness, normalization, and orthogonal connectivity. Freeze definitions or otherwise protect against mutation. Catalogue orientations are generation options; the player cannot rotate.

Each generated instance contains instanceId, shapeId, and colourId. The tray is exactly three null-or-instance slots. Give every generated instance a unique sequential piece ID within its game; retain stable keys during rendering.

At every refill generate three independent pieces **with replacement**. Each of the 25 shape IDs has equal probability; each of the seven colours has equal independent probability. Duplicates are allowed. No board-aware weighting, difficulty progression, guaranteed fit, rescue pieces, or hidden rerolls.

Use a documented deterministic PRNG, preferably the existing correct saved generator or Mulberry32 with a uint32 state. Use unbiased bounded-integer sampling, such as rejecting uint32 outputs at or above `floor(2^32/bound) × bound` before modulo. Permit controlled generator state or pure sampling adapters in tests. Store the state **after** generation to preserve the future sequence.

Create initial seed and game ID only at bootstrap or New Game/Restart command boundaries, outside renders/reducers. Use browser crypto when available and document a non-security fallback. Pure engine randomness transforms stored state to values and next state. Rendering, pointer previews, resizing, effects, invalid commands, and stale commands must not generate pieces or advance that state.

## 8. Authoritative state and engine contracts

Use one root useReducer owned by GameProvider and Context for state/commands. Prefer separate contexts if helpful. Keep persistent data distinct from transient UI:

| Area | Fields |
|---|---|
| Profile | schemaVersion, bestScore, soundEnabled, motionMode, tutorialDismissed |
| Game | schemaVersion, rulesVersion, gameId, board, tray, score, startingBestScore, status, moveCount, revision, nextPieceId, rngState |
| Root UI | screen, activeModal, pendingResolution |
| Local interaction | selectedPieceId, candidate, focus, pointer ID, grip fraction, drag position, measurements |

Use immutable transitions. Increment revision and moveCount once per accepted move. Guard placements with expected game ID, revision, and live piece instance ID. Do not maintain competing board/score state, persist transient interaction, or send pointer frames through global context. Derive legal moves and preview validity rather than storing alternate truths.

Keep engine code in plain JavaScript without React or external API access. Implement and document actual signatures/returns for equivalents of:

- createEmptyBoard, normalizeShape, generateCatalogue.
- nextRandom, generateTray.
- canPlace, getLegalAnchors, hasAnyLegalMove.
- findCompletedLines, getUniqueClearedCells, calculateMoveScore.
- resolvePlacement, createNewGame.
- validateSavedProfile, validateSavedGame.

The same canPlace implementation must drive drag previews, releases, keyboard/select placement, legal-move detection, and tests.

Provide actions equivalent to START_NEW_GAME, CONTINUE_GAME, PLACE_PIECE, COMPLETE_RESOLUTION, OPEN_MODAL, CLOSE_MODAL, GO_HOME, CONFIRM_RESTART, SET_SOUND, SET_MOTION, and DISMISS_TUTORIAL. Reducers must not access localStorage, random/crypto/time APIs, DOM, audio, timers, or network. Dispatch does not return the next state.

## 9. One complete placement transaction

Resolve an accepted move in this order:

1. Gate on Game screen, active status, no blocking modal, and no pending resolution.
2. Verify expected game ID/revision and live piece ID.
3. Resolve its catalogue shape and validate integer anchors plus all occupied coordinates.
4. Reject invalid/stale inputs without stable state or RNG changes.
5. Copy the board and place the piece.
6. Detect every full row and column on that same placed board.
7. Build their union and remove each coordinate once.
8. Calculate the entire score once.
9. Consume exactly the selected slot.
10. If every slot is null, generate a new tray using stored RNG state.
11. Check the cleared board against every remaining/refilled piece.
12. Derive active/gameOver and update score, best, revision, move count, ID counter, and generator.
13. Commit the final game/profile plus one transient presentation event in the root transition.
14. Persist the stable final state independently of animation completion.
15. Render feedback from snapshots and complete it only for its matching token.

Return placed coordinates, completed row/column indices, unique cleared coordinates, point breakdown, relevant before/placed/final board snapshots, and a unique token derived from game ID and new revision.

The final board commits immediately. Intermediate snapshots are presentation only. Do not implement clearing, scoring, refill, and game-over detection as a chain of effects. Old completion callbacks cannot alter a restarted game. If presentation is interrupted, reveal the committed final state and safely unlock or pause input.

## 10. Pointer, touch, and keyboard interaction

Use native Pointer Events for mouse, touch, and pen. Capture one primary pointer and ignore secondary pointers. Under about 6 CSS px movement, a pointer gesture acts as selection; crossing that threshold starts dragging.

During drag reserve the source slot, render one floating board-scale piece through a portal, preserve the fractional pickup grip, and lift touch pieces about 48 CSS px above the finger. Do not change gameplay during movement. Show a snapped valid ghost; invalid candidates have an outline plus icon/text. Invalid release returns the piece to its original slot without stable changes.

Measure the **inner grid** with getBoundingClientRect and consistently use client coordinates. Given horizontal gap gX:

- `cellWidth = (gridWidth − 8gX)/9`.
- `pitchX = cellWidth + gX`.
- Derive corresponding vertical values.
- Expand the tray pickup fractions into the floating piece's full bounding-box dimensions.
- `floatingLeft = clientX − expandedGripOffsetX`.
- `floatingTop = clientY − expandedGripOffsetY − touchLift`.
- `candidateColumn = round((floatingLeft − gridLeft)/pitchX)`.
- `candidateRow = round((floatingTop − gridTop)/pitchY)`.

Use the **same visible candidate for preview and release**. Never clamp out-of-bounds anchors into legal cells. The lifted piece may fit while the finger lies outside the grid; validate the visible piece candidate rather than finger containment.

Dispatch one guarded move on a valid drop. Suppress the synthetic pointer click after dragging without breaking keyboard/assistive activation. Set touch-action before gestures begin; prevent native piece dragging and text selection. Keep page areas outside play surfaces scrollable.

Cancel uncommitted gestures on pointercancel, lost capture, Escape, modal opening, leaving Game, restart, resize/orientation changes, and backgrounding. Use ResizeObserver and suitable scroll/viewport listeners to refresh measurements; clean them up.

Provide semantic piece buttons, an accessible 9-row/9-column grid, coordinate/occupancy labels, roving grid focus, and visible focus. Users can select a piece, select an anchor, preview, then press Place; Place is enabled only for a legal candidate. Cancel changes no gameplay. Tab reaches available pieces/controls; Enter/Space selects; arrows move grid focus/candidate; Enter commits a valid candidate; Escape cancels selection or closes a dismissible dialog. Make shape footprints understandable without relying solely on colour.

Use polite discrete announcements for placements, points, clears, rejection, and game over. Do not announce every pointer movement.

## 11. Persistence, lifecycle, and feedback

Read/parse/validate storage once **outside React rendering**, construct a bootstrap snapshot, then mount the provider. Launch to Home. Use independent versioned keys such as `prismNine.profile.v1` and `prismNine.game.v1`.

Save schema/rules versions, every stable game field, profile preferences, best score, and original starting best. Do not save pointer coordinates, selection, previews, modals, effects, timers, or DOM measurements.

Validate exact board dimensions/allowed cells; three tray slots with at least one non-null; recognized shapes/colours; unique live IDs; valid game ID, versions, RNG, settings, safe nonnegative integer scores/counters; coherent piece counters; and no full row/column in a stable saved board. Recompute status and correct a stale status when the rest is valid. Do not regenerate a valid saved tray or reset its generator.

On restore set profile best to the maximum of independently valid profile best, game score, and startingBestScore; preserve the game's startingBestScore itself. Invalid game data must not erase valid profile settings/best. Catch bad JSON, unsupported versions, unavailable storage, quota failures, and write exceptions. Continue in memory and show one unobtrusive save-unavailable notice where appropriate. Never clear unrelated storage.

Write when stable profile/game changes, not on drag frames or unrelated UI toggles. Identical writes are harmless. Save accepted results before clearing animation completes. Flush the latest committed snapshot on appropriate lifecycle boundaries. Home preserves progress. Restart creates a fresh ID/seed, empty board, zero score/moves, and fresh tray while preserving profile and invalidating old callbacks.

Use focused hooks for geometry, pointer interaction, persistence, motion preferences, audio, visibility pause, and resolution timing. Effects synchronize external resources; they never decide scores, clears, generation, or game over. Keep development StrictMode enabled. Clean every timer, frame, listener, observer, subscription, and audio resource. Each setup must recreate resources removed by cleanup; do not use a blanket “already ran” ref that breaks StrictMode. Keep hook dependencies correct.

Web Audio is optional in operation but sound controls must work. Initialize/resume only from user gestures; reuse the context; use short quiet pickup/place/clear/reject/game-over notes; mute and pause must stop/suspend them. No background music is required. Deduplicate one-shot sounds by resolution token with bounded history. No delayed bursts after resume/backgrounding. Audio or visual failures never alter gameplay.

## 12. Technical approach and project organization

For a new browser project, use React, React DOM, Vite's React integration, ES modules/JSX, functional components/hooks, useReducer, Context, and plain CSS/CSS Modules. This provides a small, inspectable implementation without a game engine or drag framework. If the project already exists, preserve its compatible structure and dependencies.

Limit runtime dependencies to React and React DOM unless a concrete requirement justifies another. Do not add Redux/Zustand, a component kit, animation framework, drag-and-drop library, React Router, backend, or paid dependency just for this task.

Use compatible stable development dependencies for Vitest, React Testing Library, user-event, jest-dom, jsdom, linting, and practical browser automation. Inspect installed versions before changing them; record actual resolutions in the lockfile and document the combined real Node/npm requirements. Consult official version-appropriate documentation when needed.

Organize or retain clear modules for engine/constants/shapes/random/reducer/storage, provider/state/commands, Home/Game screens, Board/BoardCell, Piece/PieceTray, DragOverlay, controls, feedback, modals, accessibility announcements, storage notice, hooks, styles, and tests. Document their concrete connections. Separate components as useful without scattering authoritative transitions.

Implement end-to-end paths for launch, New Game, Continue, drag preview/drop, invalid return, third-piece refill, select-and-place, keyboard, pause/settings/help, confirmed restart, game over/replay, Home preservation, background pause, and resize cancellation.

Remove starter demo content, dead imports, placeholder buttons, and broken asset references. Every referenced file/asset/script must exist.

## 13. Scope

**Essential first complete version:** every rule, screen, control, state/save path, responsive behavior, accessibility alternative, and verification requirement in this prompt. Sound settings, reduced motion, pause, restart, and game over must be connected rather than decorative controls.

**Optional after essentials:** bounded particles, extra original themes, local statistics, and additional device testing. Optional additions must not introduce undisclosed rules or delay finishing essentials.

**Future only, requiring explicit rules:** rotation, undo, hints, hold, power-ups, levels, timed modes, daily puzzles, and PWA/native packaging. If later authorized, define their limits and consequences for scoring, generation, and saving before implementation.

No accounts, advertisements, payments, online leaderboards, multiplayer, backend services, or paid dependencies.

## 14. Automated acceptance tests

Use deterministic fixtures and meaningful assertions, not tests that simply mirror implementation. Cover:

- Exactly 25 normalized, unique, connected shapes.
- Valid placement, every edge, actual occupied-cell validation, overlap, out-of-bounds, noninteger anchors, and an occupied empty bounding-box corner.
- Invalid/rejected actions preserving original inputs, score, tray, revision, RNG, and stable save.
- No-clear scoring; one row; one column; unrelated cells preserved; full 3 × 3 region not clearing.
- Vertical domino completing two rows: **18 unique cells, 320 points**.
- Single cell completing a row and column: **17 unique cells, 310 points**.
- Simultaneous line detection, union clearing, and every scoring example above.
- Consuming one stable slot; unchanged unused piece identities; refill only on the third consumption.
- One blocked plus one fitting piece remaining active; genuinely unplayable remaining tray; legal moves created by clearing; newly refilled fitting/unplayable trays checked without hidden rerolls.
- Deterministic sequence, unbiased bounded sampling, controlled adapters, and saved RNG continuation.
- Stale/duplicate commands, modal/screen/resolution gates, matching tokens, restart preserving profile and invalidating old work.
- Save round trips, malformed JSON/data, unsupported versions, bad settings/counters/IDs, status correction, independent best preservation, unavailable storage, and quota exceptions.

Component tests must connect Home → New Game, selection → correct cells/score, keyboard play, used slots/refill, pause/settings gating and focus restoration, confirmed restart/cancel, replay, sound/motion settings, restored state, and visibility pause. StrictMode must not duplicate moves, points, refills, effects, or subscriptions. Verify repeated mount/cleanup.

jsdom does not prove real drag geometry, audio playback, visual layout, or touch performance. Use real-browser checks for those wherever available.

## 15. Practical browser acceptance

Run the development server during implementation, build static production output, and test its preview. Check approximately **320 × 568**, **390 × 844**, **768 × 1024**, **1440 × 900**, and a short landscape viewport.

Inspect square board dimensions, 81 cells, header wrapping, long scores, tray pieces fitting their slots, scroll behavior, dialogs, focus, valid/invalid previews, simultaneous clears, and reduced motion. Capture screenshots where available and inspect them rather than only generating them.

Exercise:

1. Mouse/touch valid placement with preview coordinates matching final occupied cells.
2. Overlap and out-of-bounds drops leaving board/tray/score/RNG/revision/save unchanged.
3. Stable consumed slots and correct refill timing.
4. Intersecting clears/scoring and correct game-over timing.
5. Corner/edge placement, fractional cell sizes, scroll offsets, and finger-outside/lifted-piece-inside cases.
6. Resize/orientation change during drag, Escape, pointer cancellation, and secondary pointers.
7. Keyboard/select-and-place complete loops, modal focus trap/restoration, and no background placement.
8. Rapid conflicting inputs, repeated restart, refresh during feedback, and exact restore continuation.
9. Sound/mute, Auto/Reduced motion, backgrounding, no stuck gestures, and no delayed sound bursts.
10. No ordinary-play console errors, hook/key warnings, missing assets/imports, duplicate effects, or mutation bugs.

Distinguish emulated touch from real-device testing. Do not claim browser-console cleanliness, screenshots, audio quality, or production playability from unit tests alone. If a sandbox blocks server sockets or browser launch, report the specific limitation, finish all independent work, and leave executable browser checks with exact commands. Do not present test discovery as execution or an existing server log as proof of a reachable game.

## 16. Deliverables and completion report

Create files in the supplied workspace. Deliver a complete project with source, assets, reproducible lockfile, configured scripts, meaningful tests, README, expanded game rules/RNG contracts, workflow connections, and honest verification results. Do not stop after scaffolding or planning.

Provide working scripts equivalent to:

- `npm run dev` — development server.
- `npm test` — watch tests.
- `npm run test:run` — deterministic test run.
- `npm run lint` — configured lint checks.
- `npm run build` — static production build.
- `npm run preview` — local production preview.
- A documented browser verification command if automation is provided.

Document actual Node/npm prerequisites, `npm ci` for the lockfile, installation when needed, the server's **actual printed local URL**, stopping it with Ctrl+C, production dist serving, controls, scoring, save behavior/limitations, and accessibility settings. Do not invent `npm start` or tell users to open JSX directly.

Finish with a concise report stating what was implemented/fixed; how components, commands, reducer, engine, persistence, and feedback connect; exact launch/test/lint/build/preview commands; checks actually run and their results; and any remaining limits. Do not claim an unexecuted check passed.

**Build, connect, run, verify, and deliver the complete Prism Nine experience.**
