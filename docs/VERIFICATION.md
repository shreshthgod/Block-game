# Joy upgrade verification

26 October 2026. Node 24.21.0 / npm 11.19.0; headless Chromium 151.0.7922.34. No applicable AGENTS.md was found in the project/inspected ancestors. The existing provider/reducer, pure engine/shared rules, input hooks, seeded generators, persistence, themes and audio were extended. Package files, lockfile, runtime dependencies and lint configuration were not changed.

## Baseline

The existing 8 × 8 Flow/Classic implementation passed **129 tests in 14 files**, lint and build. Source confirmed 25 fixed legacy shapes, original Classic draws, Flow versions 1/2, version-2 storage, RAF/release-coordinate input, six older themes and optional system speech. No active 9 × 9 grid existed; the upgrade keeps that older board solely in migration/archive validation.

## Checks actually executed

| Command/check | Result |
|---|---|
| `npm run test:run` | **145 passed across 15 files** after Joy, recovery, wins, migration, speech and catalogue changes. |
| `npm run lint` | **Passed** Oxlint deny-warnings and ESLint, including hook/dependency rules. |
| `npm run build` | **Passed**, static Vite output, React/React DOM remain the only runtime dependencies. |
| `npm run test:browser` | **28 passed**, production Chromium execution, including five viewports, six new themes, input, Joy recovery/win/collection, refresh, replay, speech controls and performance trace. |
| `node scripts/simulate-joy.mjs` | Executed Classic/Joy with four fixed seeds and two policies, cap 96 moves; [complete report](JOY_SIMULATION.json). |
| `node scripts/benchmark-joy.mjs` | Executed 72 actual Chromium generator measurements; [raw report](JOY_BROWSER_GENERATOR.json). Median 4.7 ms overall, p95 16.4 ms, maximum 25.6 ms on this host. |
| Visual inspection | Actual Home/Joy desktop screenshots inspected; browser screenshot artifacts generated at every target viewport and for all six core themes. No mockup is presented as a browser screenshot. |

Browser execution is actual execution, not discovery. There are no current environment blockers. Speech scheduling assertions use controlled browser speech doubles and are not audible native-voice verification.

## Changed-behavior coverage

- Exactly 64 cells/indices 0–7; all edges; complete eight-cell rows/columns; simultaneous deduplicated 15-cell crossing for 310 points; unchanged score formula; no 3 × 3 region clearing, gravity or cascades.
- Original 25-entry Classic/Flow catalogue remains stable. Joy-only six-cell L orientations are explicit and fixed; useful large square/rectangle/L pieces are selected when compatible routes exist.
- Joy witnesses replay through real shared rules, including a clear making a previously blocked large piece playable. At least one initial legal move, truthful All Clear routes, bounded fallback/configuration, unknown versus impossible distinction and post-clear generation.
- Same seed/state reproduces tray, IDs, RNG and shape/category history. Joy save/reload matches uninterrupted play through refills/goal continuation/recovery. Legacy Flow/Classic continuation stays on saved algorithms. Theme and invalid/stale commands do not advance gameplay RNG.
- Joy stuck state offers explicit New Pieces, not ordinary game over. Only unconsumed slots change; board/score/used slots remain. Legal next move exists in tested recovery states. Duplicate recovery commands reject. Classic still has normal no-moves game over.
- Twelve-line goal counts simultaneous lines; win is committed once. All Clear requires actual cleared lines leaving an empty board. Continue preserves board/tray/score/RNG and starts a fresh fixed target segment; win takes precedence over recovery. Refresh and repeated reconciliation do not duplicate round/statistic credit.
- Schema-3 dimensions, counters, discarded-piece accounting, goal identity/award status, category history, mode versions and profile statistics validated. Supported schema-2 Flow/Classic and old preferences migrate; incompatible larger boards never load/crop. Corrupt game and denied storage preserve independent profile/in-memory behavior.
- All Clear priority, simultaneous Burst/Double/Triple/Mega mapping, score-neutral Amazing milestones, once-only relevant You did it follow-up, StrictMode deduplication, mute/zero volume, missing speech, asynchronous voices and pause/restart/background cancellation. No saved speech queues or fake voice assets.
- Immutable snapshots, bounded unique particles, rapid moves retiring effects, stale timer guards, reduced motion, exact release coordinates/scaled geometry, keyboard traversal, select/place, focus trapping/restoration, observer/audio cleanup and RAF hot-path regressions.
- Solid-token contrast tests cover all six new themes plus preserved older themes for text, focus, button and occupied/empty distinction. New light themes also use dark invalid-preview accents. This is not a full rendered accessibility certification.

## Browser scenarios

Target sizes: 320 × 568, 390 × 844, 768 × 1024, 1440 × 900, 844 × 390. Assertions check 64 cells, square board/no horizontal overflow, tray silhouette bounds, mouse edge drags, actual scaled/release geometry, Chromium-emulated lifted touch, keyboard/select-place, settings/theme/focus, pause, refresh and legacy replay into Joy.

Joy-specific browser cases verify recovery retaining a used slot, score and board; an actual 15-cell All Clear completing the 12-line goal; one persisted win after refresh; Continue retaining canvas/RNG with progress reset to zero for the next segment; collected milestone state; readable Joy trays across all five sizes. The performance case emits JSON and a Chrome trace under test-results.

## Simulation interpretation

Both Joy policies had **zero legal-first-move violations** and verified all 132 sampled fresh trays per policy. Large pieces appeared in about 85.6% (greedy) and 81.8% (First Legal) of fresh trays; medium pieces remained the largest supporting category. Reachable clearing routes appeared in about 95.5%/97.7% of these samples. The .60 large preference is conditional tuning, not an output guarantee.

Across four runs per policy, Joy produced 16/14 genuine round wins and used recovery 4/31 times. Neither policy earned an All Clear in this sample. Generated All Clear fixture tests pass, but no regular All Clear frequency is promised. Exhausted bounded searches were recorded honestly, while already constructed witnesses supplied valid proof. No bot result establishes human enjoyment, difficulty or retention.

## Remaining manual work

Real phones/tablets, native touch/pen, screen readers, actual audible system voice delivery/loudness, safe-area/zoom combinations and prolonged resource profiling remain manual follow-up. Emulated touch is not real-device testing. System speech may use device services and may not work offline. Local profiles/archives can be lost if browser storage is cleared or evicted; storage failure notices remain accurate.
