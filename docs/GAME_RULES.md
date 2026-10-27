# Exact rules and transactions

`BOARD_SIZE = 8`; existing `SIZE` imports alias it. Exactly 64 `null | colourId` cells, indices 0–7. The original catalogue has 25 immutable fixed orientations. Joy adds four six-cell L orientations (IDs 25–28), for 29 total. Classic/Flow never draw the extra shapes. Every orientation fits an empty board.

All shape cells must be in bounds and empty. The anchor is the top-left of the shape's bounding box, including an empty corner. Complete eight-cell rows/columns clear simultaneously. Intersections clear once: `8R + 8C − RC`. One crossing is 15 cells. No region clears: a 3 × 3 square placement alone earns 90 and stays on the board. No rotation, gravity or cascades.

## Score

`10P + 100L + 50L(L−1)` with L = completed rows + columns. Award once per accepted placement. Four cells/no clear: 40; two cells/two rows: 320; one cell/crossing: 310. The multi-line bonus is included in the displayed move total. Recovery, round wins, badges, streak and All Clear add no gameplay points.

## Atomic accepted move

1. Guard active status, game ID, exact revision and current piece identity. Invalid commands return without RNG/counter/profile/save change.
2. Use shared `simulateMove`: place in a copy, detect all full lines, deduplicate cells, calculate score, clear simultaneously.
3. Consume exactly the chosen stable tray slot.
4. Update cumulative lines, largest burst/piece and score-neutral consecutive-clear streak. Detect All Clear only if lines cleared and the resulting board is empty.
5. Refill only if all three slots are consumed, using the post-clear board and saved mode/generator history/RNG.
6. Check all remaining pieces. In Joy, reaching the current fixed 12-line goal takes precedence: mark round won once. Otherwise choose active or recovery. Classic/Flow choose active or gameOver.
7. Commit board, tray, score, statistics, counters, goal and RNG together. Root reducer updates mode record and reconciles profile progress in the same transition.
8. Return an immutable result with token, placed/cleared coordinates, old colour snapshots, real points and All Clear/round-win metadata. Save committed state before effects finish.

Effects and speech only present/retire committed results. A new move may replace old effects immediately. Old callbacks cannot score, refill, win or affect another game.

## Joy round and recovery commands

Every segment targets 12 lines with no time/move limit. Simultaneous lines each count. Continue requires the completed round ID and current game/revision; it retains board/tray/score/RNG, increments the segment index, sets its baseline to the full current cumulative line count and recomputes active/recovery status. A burst overshoot is retained in totals but does not cause several immediate victory dialogs.

New Pieces requires a current Joy recovery state and guarded identity. It replaces only non-null slots, advances piece IDs/RNG/history once, increments recovery/discard counters, and preserves board, score, move count and goal. Used slots remain empty. Unlimited assistance has no penalty. A full inconsistent board with no catalogue fit is handled explicitly; valid committed boards with an empty cell always permit the single-cell shape.

An earned win increments round/statistics exactly once. A per-game profile watermark prevents duplicate credit when the same state is loaded/reconciled again or profile/game writes complete separately. Milestone badges derive from monotone statistics and never multiply score.

## Continuation

New Joy: rules/generator/config 3/3/3. New Classic: rules2/generator1/config1, original interleaved shape/colour RNG. Supported Flow: rules2 with generator/config 1/1 or 2/2 retained exactly. All gameplay randomness uses the seeded primitive. Theme rotation is independent cosmetic entropy; tile colours are stable cosmetic IDs.

No 9 × 9 grid is rendered. Legacy larger-board data is recognized solely for preservation/migration, never cropped into this engine. [Save schema](SAVE_SCHEMA.md), [Joy generation](GENERATOR.md).
