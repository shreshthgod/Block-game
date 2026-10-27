# Project overview — Joy upgrade

Prism Nine now centers on a colourful, forgiving **8 × 8 Joy mode**, while preserving the existing React/Vite architecture, scoring, input hooks, Classic and supported legacy Flow games. There is no playable 9 × 9 grid. A 3 × 3 piece is a nine-cell shape, not a clearing region.

Joy uses real round goals (12 lines), explicit free recovery instead of early no-moves loss, larger cooperative pieces and earned All Clears. Three stable slots and fixed orientations remain. All authoritative changes happen in the root reducer/pure engine; effects and speech cannot score, generate pieces, award wins or alter the board.

## Implementation map

| Module | Responsibility |
|---|---|
| `game/constants.js` | Single board size 8, versions, 12-line target, profile/statistic defaults |
| `game/rules.js`, `engine.js` | Shared legal simulation, atomic scoring/clearing/refill, Joy rounds/recovery, immutable results |
| `game/shapes.js` | Unchanged legacy 25 entries plus four Joy-only six-cell L orientations |
| `game/joy.js` | Cached board geometry, size/category preferences, cooperative constructive routes, bounded All Clear search and recovery replacements |
| `game/evaluation.js`, `traySearch.js` | Legal anchors, mobility, bounded verified/impossible/unknown sequence search using real rules |
| `game/random.js`, `flow.js`, `flowV1.js` | Original Classic and supported Flow continuation, unchanged distributions |
| `game/reducer.js`, `context/GameProvider.jsx` | Guarded commands and one authoritative state; profile/goal updates in the committed transition |
| `game/progress.js` | Per-game monotone progress watermarks and permanent local milestones |
| `game/storage.js` | Explicit schema-3 validation/serialization and schema-2 migration; independent profile recovery |
| `screens/`, `components/` | New Home, goal bar, recovery/win/collection dialogs, readable tray and real clear previews |
| `themes.js`, `styles/tokens.css` | Six colourful core looks; preserved previous themes; responsive and reduced-motion styles |
| `audio/`, `hooks/useAnnouncer.jsx`, `useGameAudio.jsx` | Optional speech adapter, bounded priority/follow-up scheduling, effects and volume controls |
| Remaining hooks | Preserved RAF dragging, release-coordinate geometry, visibility cancellation, persistence and motion preference |

New installations select Joy and Candy Carnival. Existing theme/mute settings are preserved. New-game selection exposes Joy and Classic; legacy Flow remains resumable at its saved versions. Starting over from Flow explicitly offers Joy.

All Clears require cleared lines and zero remaining occupied cells. Round wins are flagged/credited once in the move transaction. Continue preserves the entire canvas and RNG, changes only the goal segment/revision/status, and resolves a stuck tray after the win. Recovery replaces unconsumed pieces only, never the board or score.

Profile statistics and milestones are local. Per-game watermarks make reconciliation idempotent after refresh/partial writes. Schema-2 games have unknown historical statistics initialized at zero rather than invented counts. No particle or speech queue is saved.

Runtime dependencies remain React and React DOM only. No toolchain, lockfile, infrastructure, account or paid-service change. [Verification](VERIFICATION.md), [generator](GENERATOR.md), [schema](SAVE_SCHEMA.md), [audio](AUDIO.md).
