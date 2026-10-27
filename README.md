# Prism Nine — Make room. Make a burst.

A colourful, untimed **8 × 8** block puzzle. The playable board contains exactly **64 cells**; there is no 9 × 9 play grid. React 19, JavaScript, Vite 8 and plain CSS; React and React DOM remain the only runtime dependencies. No accounts, purchases, advertisements or backend.

## Play Joy

Joy is the default for new players. Clear **12 rows/columns** to complete a round. Useful medium and large pieces can work together: a piece marked **Make room first** may need another piece to clear space. Trays have verified legal routes where possible; your placement choices still matter, and any order is not guaranteed.

If none of your remaining pieces fits, choose **New Pieces**. This free, unlimited assistance replaces only unconsumed slots, preserves the board and score, and records its use transparently. No hidden rerolls or board resets.

A completed round offers **Continue Playing**, **New Round**, and **Home**. Continue preserves board, pieces, score and RNG, starting the next 12-line segment at the current cumulative line count. The full final burst counts toward statistics. New Round starts fresh after replacement confirmation. Home/Pause lets you finish for now and return later without losing committed progress when saving works.

**Classic** retains its original independent random pieces and normal no-moves game over. Its record is separate from Joy. Existing Flow saves continue with their saved generator/rules; Flow is no longer offered as another new-game mode. Starting a new game from legacy Flow explicitly uses Joy.

## Rules and controls

- Three stable slots, fixed orientations, any piece order. Refill only when all three are consumed; explicit Joy recovery preserves already-used slots.
- Eight occupied cells complete a row or column. Completed lines clear simultaneously; crossing cells clear once. A crossing clears **15 unique cells**.
- No gravity, cascades, player rotation or region clears. A **3 × 3 piece** occupies nine cells; filling a 3 × 3 area alone never clears it.
- Score remains `10P + 100L + 50L(L−1)`. A single-cell crossing is **310 points**. Recovery, badges, round wins and All Clear celebrations add no hidden score bonus.
- An earned **All Clear** requires actual line resolution leaving an empty board. Fresh boards and recovery are never counted as All Clears.
- Drag with mouse/touch, or select a piece, choose an anchor and press Place. Touch lifts pieces above your finger. Legal ghosts and completed-line previews use real rules.
- Keyboard: Tab to a piece, Enter/Space to select, Tab to the board, arrows to move, Enter/Space to place; Escape cancels. The anchor is the top-left of the shape's bounding box, including an empty corner.

## Pieces, looks and celebrations

Joy keeps the original 25 shapes and adds four fixed six-cell L orientations, for 29 entries. Large pieces include 2 × 3 and 3 × 2 rectangles, the 3 × 3 square and six-cell Ls. Classic/Flow retain their original 25-entry distribution. Generation considers actual gaps, clear opportunities, reachable large placements and variety using seeded, bounded search. [Generator and tuning](docs/GENERATOR.md).

Six free core themes: **Candy Carnival** (new-install default), **Ocean Pop**, **Neon Arcade**, **Sunset Fiesta**, **Forest Friends**, and **Cosmic Prism**. Existing looks/preferences remain available under Previous looks. Optional New look each game is off by default. Theme changes preserve tile identities, score, pieces and gameplay RNG.

Settings includes master mute, independent effects/voice switches and volumes, and voice preview. Optional browser speech announces Burst, Double/Triple/Mega Burst, All Clear, Amazing, New Best, and a still-relevant round win. No recorded voice clips are bundled. System voice quality/availability varies and offline speech is not guaranteed. Reduced motion replaces particles/travelling effects with brief outlines and readable text. [Audio adapter and scheduling](docs/AUDIO.md).

My collection shows permanent local milestones and statistics: rounds won, lifetime lines, largest burst/piece, All Clears, recovery use and separate records. No daily streak, login or deadline is required. Milestone badges are decorative; all core themes are available immediately.

## Run and verify

Node.js `^24.15.0 || >=26.0.0`, npm `>=11`; keep the lockfile.

```bash
npm ci
npm run dev
npm run test:run
npm run lint
npm run build
npm run test:browser
node scripts/simulate-joy.mjs
node scripts/benchmark-joy.mjs
```

Open Vite's printed Local URL (usually localhost:5173). Playwright uses a production preview and installed Chromium (`npx playwright install chromium` if needed). For an existing server: `PRISM_URL=http://localhost:5173 npm run test:browser`. Serve `dist/` at the root of a static host. Local saves do not provide cloud backup or offline asset caching.

## Saves

Schema **3** stores explicit board size, rule/generator/config versions, continuation, category history, round goal/award status, statistics and compatible preferences. Supported v2 Classic/Flow games migrate without changing their generation behavior. Incompatible legacy boards are never cropped or loaded; their original bytes remain protected/archived. Current authoritative keys are `prismNine.profile.v3` and `prismNine.game.v3`.

Per-game monotone progress watermarks prevent repeated round/statistic credit on refresh or partial profile/game writes. Invalid game data cannot erase a valid profile. Storage failure permits in-memory play with an accurate notice; clearing browser/origin storage can erase local progress. [Schema and migration](docs/SAVE_SCHEMA.md).

See [PRD](docs/PRD.md), [overview](docs/PROJECT_OVERVIEW.md), [rules](docs/GAME_RULES.md), [workflow diagrams](docs/WORKFLOW.md), [verification](docs/VERIFICATION.md), and [performance](docs/PERFORMANCE.md). Browser execution includes emulated touch and controlled speech scheduling; native devices, screen readers and audible voice quality remain manual checks.
