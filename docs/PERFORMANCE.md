# Joy performance and reproducible tuning

Node 24.21.0; unthrottled headless desktop Chromium 151.0.7922.34. No FPS, mobile latency, GPU dropped-frame or human-retention claim is made.

## Generation

`node scripts/simulate-joy.mjs` compares Classic/Joy across four fixed seeds and two documented policies, capped at 96 moves. Greedy maximizes immediate lines then size; First Legal takes the first slot/anchor and deliberately makes imperfect strategic choices. Joy continues rounds and explicitly recovers when stuck. [Full JSON](JOY_SIMULATION.json) records per-seed outcomes, size frequencies, setup pieces, clear opportunities, search exhaustion, recovery cost and shape repetition.

The recorded samples have zero Joy legal-first-move violations and verified routes for every sampled fresh tray. Large pieces occur in roughly 82–86% of fresh Joy trays, medium pieces are the largest supporting group, and all-small trays are rare. The configured .60 conditional size preference is not an output quota; actual clear opportunities and candidate ranking affect the observed rate. Both policies completed genuine rounds. The imperfect policy used substantially more recovery. Neither bot earned an All Clear in these runs, and no fixed All Clear interval is promised. Unit fixtures verify real generated All Clear routes.

Fresh-tray distribution/proof metrics are separate from recovery draws. Recovery distribution/cost is recorded separately, with unconsumed slots only. Timing excludes report classification work; initial creation is timed, with deterministic diagnostic replay outside its timing. Bot outcomes are not human enjoyment or retention evidence.

`node scripts/benchmark-joy.mjs` temporarily bundles the actual pure Joy generator into Chromium. [72-sample JSON](JOY_BROWSER_GENERATOR.json): 24 seeds each on empty, isolated-space and diagonal-gap boards. Recorded median is 4.7 ms across fixtures; p95 16.4 ms, max 25.6 ms. Empty-board median is 14.6 ms, p95 18.2 ms. Results depend on host/JIT and are not device promises. The bounded workload did not justify adding a worker in this upgrade.

Analysis caches occupancy geometry within a generation call. Joy uses 29 shapes and fixed empty mobility 1237; legacy Flow stays at 25/1117. Default candidate count 3, anchor samples 8, generic search 400 nodes and optional All Clear search 350 nodes per candidate. Hard caps are centralized. Every route uses real rules; budget exhaustion is unknown, not impossible. No clock decides output and no generation occurs during dragging.

## Interaction and effects

The existing RAF/ref drag model is retained: one queued frame, transform overlay, React updates for changed snapped candidates/validity, no per-frame layout reads. Release coordinates determine the committed anchor. Geometry/pause/navigation/visibility interruptions cancel capture. Board-cell memoization remains, and one candidate's clear preview reuses real simulation rather than running the generator.

Effects present an already committed/saved board, with immutable old-colour snapshots and token cleanup. A new active-game move retires older overlays. Particle count is bounded at one per unique cleared cell, maximum 64; crossing fixture peaks at 15. Main presentation is 480 ms, reduced 200 ms. Reduced motion removes particles, travelling sweeps and shrinking tiles. All Clear uses a restrained board outline, not repeated full-screen flashing.

Speech has one active source, bounded dedup history and at most one still-relevant win follow-up. Effects have at most 16 short voices, master volume and ducking. Lifecycle cleanup covers frames, timers, listeners, observers, nodes and speech.

## Browser and manual checks

`npm run build && npm run test:browser` executes square-board/overflow/theme/input checks at 320 × 568, 390 × 844, 768 × 1024, 1440 × 900 and 844 × 390. Joy-specific tests check tray silhouettes, recovery, wins, collection and continuation. Desktop keeps board/tray/placement controls convenient; landscape uses two columns; short phones scroll.

The performance recording case emits `performance.json` and a Chrome trace in `test-results/`, covering a 96-input drag, micro-movements and a 15-cell/310-point burst. RAF intervals and automation-inclusive task/layout/heap counters are observations, not FPS or leak proofs. Native touch/pen, screen readers, audible speech, safe areas/zoom and prolonged 30-plus-cycle resource profiling remain manual follow-up.
