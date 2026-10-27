# Product requirements — Joy rounds

26 October 2026. This scope supersedes the earlier Flow-centered experience. Priorities: useful larger pieces, frequent real clearing opportunities, forgiving recovery, achievable rounds, earned All Clears, smooth accessible input and lively presentation. No human enjoyment or retention outcome is claimed.

| Area | Implemented contract |
|---|---|
| Board/rules | Exactly 8 rows × 8 columns; 64 cells; shared size; simultaneous full rows/columns, unique intersections; no regions, gravity, cascades or rotation |
| Score | `10P + 100L + 50L(L−1)` once per accepted move; 310 for a single-cell crossing; no cosmetic, recovery, round or All Clear score additions |
| Joy | Default new-player mode, untimed, board-aware cooperative trays, 12-line rounds, unlimited explicit New Pieces assistance |
| Classic | Optional challenge with original independent random generation and no-moves game over; separate record |
| Legacy Flow | Resume saved rule/generator versions; no silent conversion mid-game. New-game UI consolidates assistance into Joy |
| Catalogue | Legacy 25 unchanged; Joy adds four fixed six-cell L orientations. Medium support and useful 6/9-cell shapes; no arbitrary gap-shaped pieces |
| Generation | Seeded Build/Burst/Setup/All Clear mixture .30/.45/.20/.05, conditional .60 large-piece preference, category/shape history, bounded candidate/anchor/node limits |
| Playability | Legal first move; real witness before claiming full-tray playability. A later shape may become legal after clears. Placement choices can block remaining pieces; Make room first state is explicit |
| Recovery | Only when Joy's remaining pieces do not fit. New Pieces replaces unconsumed slots, leaves used slots empty, preserves board/score/round and records assistance; free and unlimited |
| Rounds | Simultaneous rows/columns count toward fixed 12-line target. Win commits once, before recovery; Continue starts next segment at full cumulative total, with no repeated dialogs from spillover |
| All Clear | Earned only when normal clearing leaves no occupied cells. Text, optional speech, restrained effect and statistics; never a board reset disguised as a win |
| Profile | Rounds/lines/largest burst/All Clears/largest piece/records/recoveries plus permanent milestone badges. No daily attendance or deadline |
| Themes | Six immediately selectable colourful core themes, Candy Carnival default; preserved previous looks; tokens cover panels, cells, tiles, focus, previews, dialogs, particles and reduced motion |
| Controls | Existing mouse/touch/keyboard/select-place paths share guarded commands. Accurate ghost/release coordinates, real completed-line preview, RAF coalescing, no drag-time catalogue search |
| Audio | Optional master/effects/voice controls and volumes, preview, feature-detected system speech behind adapter; no missing or claimed recorded assets |
| Scheduling | One spoken source. All Clear first, otherwise simultaneous burst; one relevant win follow-up may follow. StrictMode deduplication, bounded history and lifecycle cancellation; no stale queue |
| Persistence | Schema 3 and explicit board/mode/rules/generator/config/goal/history. Supported v2 continuation preserved. Per-game progress watermarks prevent duplicate credit; profile/game validate independently |
| Failure | Accurate storage notice with in-memory play. Contradictory no-catalogue-fit state is handled without unbounded rerolls or fake loss/win |
| Accessibility/layout | Focus-managed dialogs, visible focus, labelled 64-cell keyboard grid, colour-independent occupancy/invalid feedback, live status and reduced motion. Five target viewports; short screens scroll rather than clip |

Home offers a dominant Play/Continue action, Joy/Classic explanations, appearance preview and compact collection progress. Gameplay prioritizes board, tray, score/goal and pause/settings. Home/Finish for now preserves committed progress. Replacing an unfinished canvas requires confirmation.

Forbidden behavior: hidden visible-piece replacement, occupied-cell removal to manufacture fits, score multipliers that do not exist, fake All Clears, forced countdowns, ads/payments for recovery, accounts/purchases/daily streak requirements, and unsupported retention claims.

Acceptance evidence and remaining native-device/speech/accessibility checks are in [VERIFICATION.md](VERIFICATION.md). [GENERATOR.md](GENERATOR.md) records conditional tuning, bounded proofs and two bot policies; simulations are engineering diagnostics only.
