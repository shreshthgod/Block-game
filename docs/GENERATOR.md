# Joy generation and tuning

New games expose Joy and Classic. Existing Flow 1/2 saves retain their original generators (`flowV1.js`/`flow.js`) unchanged. Joy's new generator/config version is **3** in `game/joy.js`.

## Catalogue and analysis

Joy uses 29 fixed orientations: the legacy 25 plus four six-cell Ls. Large shapes are ≥6 cells, medium 4–5, small 1–3. Rectangles, squares and Ls come from the fixed catalogue; no custom gap-shaped piece is invented. Classic/Flow keep the original 25-entry distribution and empty-board mobility reference 1117. Joy normalizes its 29-entry mobility against **1237** and occupancy against **64**.

Within one generation call, cache analyses by occupancy geometry. Each includes all legal anchors, actual immediate line clears, occupancy, rectangular/channel fit opportunities through catalogue anchors, normalized mobility and reachable large placements. A cheap row/column-count prefilter avoids needless simulations; all actual clear information and route steps use the shared `simulateMove` rules. Tile colour is irrelevant. No analysis/search runs during pointer movement.

## Initial configuration

| Intention | Weight | Preference |
|---|---:|---|
| Build and fit | .30 | Medium/large placements and useful room |
| Burst opportunity | .45 | A legal immediate/reachable line clear when available |
| Big-piece setup | .20 | Clear space, then use a reachable large shape |
| All Clear attempt | .05 | Prefer a real emptying move or bounded complete-tray route containing an earned All Clear |

Default three candidate trays, eight sampled anchors for non-clearing choices, 400 generic search nodes per candidate and 350 All Clear search nodes. Hard caps are five candidates, twelve anchor samples, 1500 generic/1000 All Clear nodes. No timing cutoff or unbounded retry. Invalid configuration uses safe clamped defaults. These are starting tuning values, not engagement guarantees.

A seeded .60 preference requests a large piece when compatible routes permit; setup intentions also request one. Larger pieces never override legality. Among available shapes, medium base weight is 3, large 2.4, small .3 (1.5 when it provides a clear). Clear opportunities boost weight; mild shape/category repetition penalties use persisted six-entry histories. Repeats remain possible. This does not impose an exact 60% output quota: opportunity weights and selection among candidates can yield a higher conditional rate.

## Construct, prove, rank, choose

Each candidate is constructed through actual placements on a working board. At every step enumerate the shapes that fit **that working board**, choose with seeded weights, choose a real anchor, resolve all simultaneous clears and continue. Thus a later large shape may initially be blocked but becomes legal along the recorded route. At least the first offered piece fits initially. The tray advertises full playability only when a real witness consumes every piece.

The existing bounded search independently examines piece orders/anchors with equivalent-branch deduplication. Outcomes remain verified / exhaustively impossible / unknown on budget exhaustion. A complete constructive route is already valid proof when generic search exhausts its budget. All Clear search requires an actual empty board after normal clearing at some step; later route pieces may then build on that empty canvas. When such a route is found for an All Clear intention, it is preferred rather than discarded for a size quota.

Rank candidate routes by reachable lines, size, remaining mobility, variety and All Clear opportunity; seeded weighted choice among suitable routes preserves variety. If construction cannot complete, a bounded single-cell fallback is checked; otherwise only individually fitting fallback pieces may be claimed. No visible tray is ever silently rerolled. Player choices need not follow the witness and can block remaining pieces; Joy then offers explicit assistance.

A direct call returns tray, next IDs, RNG, shape/category histories, versions, verification flag and developer diagnostics/witness. Normal engine dispatch strips diagnostics/witness, retaining only stable state. Cosmetic colours use a per-ID hash independent of gameplay RNG.

Recovery uses the same generator for the number of unconsumed slots, mapping results back into those positions. Consumed slots, board and score remain intact. No-fitting-shape returns explicitly without random retries; with a single-cell catalogue entry and an empty cell, this contradicts normal committed-board assumptions and should be investigated.

## Reproducible experiments

```bash
node scripts/simulate-joy.mjs > docs/JOY_SIMULATION.json
node scripts/benchmark-joy.mjs > docs/JOY_BROWSER_GENERATOR.json
```

The simulation uses seeds 1,42,143,853, cap 96 accepted moves, and two deterministic policies: greedy immediate lines/size, and imperfect first-slot/first-row-major legal placement. Joy continues completed segments and explicitly uses recovery when stuck; Classic stops at game over. Reports include size/frequency/repetition, large availability, initial and reachable opportunities, witness rate, setup pieces, exhausted searches, recovery/win/All Clear totals and generation cost. Fresh-tray metrics are separate from recovery piece distribution/cost. The old Flow JSON/scripts are retained as historical diagnostics.

Current samples: Joy had **zero legal-first-move violations**, all sampled fresh trays were verified, roughly 82–86% contained a large piece, and medium pieces were the largest supporting category. Both policies completed genuine rounds. The imperfect policy needed more recovery. Neither bot earned an All Clear in this sample: such clears are opportunistic, not promised at intervals. A deterministic fixture verifies a genuine generated All Clear route.

Bot survival, sampled witness rates and desktop timings are engineering evidence only. They do not prove human enjoyment, universal sequence guarantees, retention or real-device performance. See [performance](PERFORMANCE.md) and [verification](VERIFICATION.md).
