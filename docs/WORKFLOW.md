# Connected Joy workflows

## Application

```mermaid
flowchart TD
    Launch[Launch and independently validate saves] --> Home[Home: Joy / Classic and collection]
    Home --> Choice{Continue supported game?}
    Choice -->|Yes| Restore[Restore saved mode/rules/RNG]
    Choice -->|No| Confirm{Replace unfinished progress?}
    Confirm -->|Cancel| Home
    Confirm -->|Confirm or none exists| New[Seed new 8 by 8 game]
    New --> Tray[Generate complete tray]
    Tray --> Play[Place by drag / keyboard / select-place]
    Restore --> Play
    Play --> Commit[Guard and commit atomic placement/clears]
    Commit --> Save[Persist state and profile watermarks]
    Commit --> Effects[Immutable burst and optional speech]
    Commit --> Goal{Joy target reached?}
    Goal -->|Yes| Win[Round celebration exactly once]
    Win -->|Continue Playing| Segment[Same canvas/RNG; next 12-line segment]
    Segment --> Moves
    Win -->|New Round with confirmation| New
    Win -->|Home| Home
    Goal -->|No| Moves{Any remaining piece fits?}
    Moves -->|Yes| Play
    Moves -->|No in Joy| Recovery[Calm New Pieces card]
    Recovery --> Refresh[Explicitly replace unconsumed slots only]
    Refresh --> Play
    Moves -->|No in Classic / legacy Flow| End[Normal game over and replay]
    Play --> Pause[Pause / finish for now]
    Pause -->|Resume| Play
    Pause -->|Home with progress retained| Home
```

Refill occurs after clears and final-slot consumption, before goal/move status. A win takes precedence over recovery. Continue recomputes legal moves and offers recovery if still needed. A single burst never awards several segments.

## Dependency structure

```mermaid
flowchart TD
    Input[Input adapters] --> Command[Guarded identity/revision/piece commands]
    Command --> Reducer[Single root reducer]
    Reducer --> Engine[Pure atomic engine]
    Engine --> Rules[Shared placement and simultaneous clear rules]
    Engine --> Generate[Joy / Classic / retained Flow generator]
    Generate --> Search[Cached geometry and bounded sequence search]
    Generate --> RNG[Seeded gameplay RNG]
    Engine --> Result[Committed state and immutable result]
    Result --> Reducer
    Reducer --> Progress[Round and idempotent profile progress]
    Reducer --> Persistence[Validated schema-3 local saves]
    Result --> Present[Bounded visual and audio events]
    Themes[Cosmetic preferences] --> Present
```

Audio, animation and theme callbacks do not dispatch gameplay outcomes. Persistence observes committed profile/game references, not drag state, and does not wait for animation.

## Joy generation

```mermaid
flowchart TD
    Need[Initial tray / post-clear refill / explicit recovery] --> Analyze[Analyze actual geometry; cache per call]
    Analyze --> Intent[Seeded Build / Burst / Setup / All Clear intention]
    Intent --> Construct[Construct legal working-board steps]
    Construct --> Search[Bounded sequence search with real rules]
    Search --> Proof{Witness verified?}
    Proof -->|Yes| Rank[Rank clears, size, variety and mobility]
    Proof -->|No| More{Candidate budget remains?}
    More -->|Yes| Construct
    More -->|No| Fallback[Construct safe route or individually fitting fallback]
    Rank --> Choose[Seeded choice among suitable candidates]
    Choose --> Stable[Pieces, histories, IDs, RNG and versions]
    Fallback --> Stable
```

A constructed route is itself proof even if a separate generic search exhausts its budget. Unknown is not impossible. A large piece may be blocked initially and fit later after a witnessed clear; Make room first communicates this without revealing a solution. No visible piece is secretly replaced.

## Feedback and voice

```mermaid
flowchart TD
    Move[Committed immutable result] --> AllClear{Earned empty board after clearing?}
    AllClear -->|Yes| AC[All Clear text / restrained effect / priority voice]
    AllClear -->|No| Burst[Actual simultaneous burst label and phrase]
    Move --> Score[One actual move total; bonus already included]
    Move --> Access[Accessible score/line/status text]
    AC --> Win{Round also completed?}
    Burst --> Win
    Win -->|Yes and still relevant| Follow[One optional You did it follow-up]
    Move --> Reduced{Reduced motion?}
    Reduced -->|Yes| Outline[Short outline and readable label]
    Reduced -->|No| Particles[Landing, line highlight, dissolve and bounded particles]
    Particles --> Cleanup[Token/source-identity cleanup]
    Outline --> Cleanup
    Lifecycle[Pause / restart / mute / background / Home] --> Cancel[Cancel gesture, obsolete speech and transient resources]
```

Main effects last about 480 ms (200 ms reduced); they never lock the next legal active-game move. New moves retire older overlays so old colours cannot hide new tiles. Speech has one active source and at most one relevant round-win follow-up; no general queue or saved events.

## Input, appearance and continuity

The preserved drag hook coalesces pointer events to one pending RAF, uses transforms, measures at pickup/release/invalidation and commits release coordinates. Geometry derives from the shared eight-cell size including scaled gaps. Keyboard/select-place use the same validator/command. Pause, navigation, visibility and geometry invalidation cancel gestures. Board line previews call the same pure simulation on one candidate, not catalogue generation.

Theme gallery changes CSS tokens only, including portal dialogs and drag overlays. New look each game uses cosmetic entropy at a new-game boundary, never gameplay RNG. Existing themes remain selectable under Previous looks. Backgrounding flushes committed saves, cancels input/speech and pauses active sessions. Focus-managed dialogs trap/restore focus and short screens remain scrollable.
