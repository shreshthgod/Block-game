# Schema 3 and compatibility

The current authoritative keys are `prismNine.profile.v3` and `prismNine.game.v3`. Serialization validates/copies explicit fields. The playable board is always 8 × 8. Unsupported dimensions/versions are rejected; legacy 9 × 9 data is only recognized for preservation, never rendered or cropped.

## Migration

Read current keys first, then supported v2 profile/game, then v1 profile and incompatible-board recognition. Schema-2 Classic/Flow normalize to schema 3 while keeping board, tray, score, IDs, seed/RNG and rule/generator/config versions. Classic stays rules2/gen1/config1; Flow stays rules2/gen1 or2/config matching. Historical statistics absent in v2 start at zero; no past clears or wins are invented.

New Joy uses rules3/gen3/config3 and cannot be loaded as an older game. Only an explicit new game/restart adopts Joy. The Home new-game choice maps legacy Flow selection to Joy while Continue preserves the saved Flow game. Legacy Flow results explicitly offer Play Joy. Existing supported theme IDs and audio/mute/tutorial preferences survive; missing old theme uses Prism Neon, missing old voice defaults off. Fresh installations choose Joy/Candy Carnival.

When a supported v2 game has been successfully written to v3, the original bytes are retained at `prismNine.archive.game.v2` and obsolete v2 authoritative keys are removed. An incompatible v1 game remains at its original key until confirmed replacement is saved, then archives to `prismNine.legacy9.game.v1`. Profile-only writes do not delete an unconfirmed old board. Archives are not competing authoritative stores.

## Profile

- Schema version 3; separate `bestScores.classic`, `.joy`, and retained `.flow`. `bestScore` is the Classic compatibility alias, `legacyBestScore` remains separate.
- `selectedMode` for new games: Joy or Classic after normalization.
- Sound master, effects/voice switches and volumes [0,1]; motion auto/reduced; tutorial dismissed; theme ID and optional new-game rotation.
- `stats`: roundsWon, linesCleared, largestBurst, allClears, largestPiece, recoveries. Safe nonnegative integers; known bounds and win/line consistency validated.
- `progressLedger`: per-game monotone statistical watermarks. These compact counters persist to protect previous-game credit if an older game snapshot is restored. They grow with games; storage quota failures use the normal accurate notice.

All core themes are selectable. Milestone badges derive from monotone profile totals/maxima, with no per-day reset, unlock payment or gameplay reward. Clearing browser storage can erase local progress; no cloud backup is implied.

## Game

Shared fields: schema/rules/boardSize, mode, generator/config version, game identity, original seed/current UInt32 RNG, 8 arrays of 8 valid cell IDs/nulls, three stable null/piece slots, explicit live IDs/shape IDs/colour IDs, nextPieceId, score, startingBestScore, moveCount, revision, recentShapes, clearStreak and statistics.

Classic/Flow permit only IDs 0–24, original ID-window/refill count invariants, revision=moveCount and active/gameOver status. Missing old statistics/clear streak normalize safely. Flow history retains the last 3 initial or 6 subsequent draws; Classic history is empty. Old generation remains deterministic.

Joy permits IDs 0–28 and additionally stores:

| Field | Meaning/validation |
|---|---|
| `recentCategories` | Last six size groups, exactly matching recent shape identities |
| `trayVerified` | Whether a real route was constructed/verified at generation; no witness or hint is persisted |
| `round.index`, `.id` | Positive segment index and exact `gameId:round:index` identity |
| `round.target` | Exactly 12; never increased mid-round |
| `round.baselineLines` | Cumulative line count at segment start; zero initially, monotone segment bounds |
| `round.won` | Whether target was reached and credited; must agree with cumulative lines |
| `discardedPieces` | Unconsumed pieces explicitly replaced by recovery; validates piece accounting |
| `status` | active, recovery or roundWon; loader recomputes from goal and all remaining legal moves |

Joy invariants: `revision = moveCount + recoveries + round.index − 1`; `moveCount + live pieces + discardedPieces = nextPieceId − 1`; `roundsWon = round.index − 1 + (round.won ? 1 : 0)`. Recovery discards 1–3 pieces per use. History length, IDs, counters, dimensions and uncommitted full lines are validated. An awarded win takes precedence over recovery until Continue. Continue increments revision, retains RNG and starts baseline at full cumulative lines.

## Idempotent progress and failures

The accepted reducer transition updates game statistics and reconciles profile deltas above each game's saved watermark. Loading the same won state does not increment wins again. If profile writes but game does not, older game counters cannot duplicate already credited progress. If game writes but profile does not, bootstrap reconciliation recovers its missing credit. Replaying an older snapshot of the same game ID uses maximum credited counters; it may not add new lifetime credit until those maxima are surpassed.

localStorage has no multi-key transaction. Each record validates independently. A failed write reports temporary in-memory play; a valid profile is not erased because a game is corrupt. Archives are retained before obsolete keys are removed after successful replacement writes.

Pointer coordinates, selection, particles, immutable presentation snapshots, timers, search diagnostics/witnesses, spoken events and speech queues are never serialized. Theme/audio preferences never advance gameplay RNG. Tests compare uninterrupted and repeatedly loaded Joy play through refills, recovery and goal continuation.
