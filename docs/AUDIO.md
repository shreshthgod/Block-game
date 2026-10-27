# Spoken celebrations and optional sound

There are no bundled premium/recorded voice assets, placeholder files, runtime paid APIs or exposed keys. `audio/voiceAdapter.js` has an empty local-clip registry that can later accept short licensed local assets without engine changes. Until then the functional source is feature-detected browser `speechSynthesis`, with asynchronously loaded English voices preferred.

System voice availability, pronunciation and sound vary by browser/device and may use system/network services. Identical delivery and offline speech are not promised. Missing/failed speech preserves all essential text feedback. Preview reports a request, unavailable support, muted settings or zero volume accurately; a successful API request does not prove audible delivery.

## Controls

Master sound, independent effects/voice toggles, separate volumes and Preview voice are in Settings. Existing muted preferences stay muted. Missing old voice defaults off; fresh installations enable optional voice behind normal user-interaction requirements. Zero voice volume cancels active speech. Effects use a bounded Web Audio master gain and duck to 28% under speech; at most 16 short effect voices.

## Committed-event mapping

| Event | Phrase |
|---|---|
| One simultaneous line | Burst! |
| Two simultaneous lines | Double Burst! |
| Three simultaneous lines | Triple Burst! |
| Four or more | Mega Burst! |
| Real empty board after line clears | All Clear! |
| Clearing-streak milestone 3, 6, 9… | Amazing! |
| First crossing of the game's starting best | New Best! |
| Round completion, still relevant | You did it! |
| Legacy/Classic game over without a higher celebration | Nice game! |

All Clear takes immediate priority; otherwise use the simultaneous burst. Lower-priority record/streak speech is omitted when it would clutter the event. Three separate one-line moves are not Triple Burst. No Perfect Clear or fresh-board/reset All Clear is fabricated. Score is not read on every increment.

For a winning move, one optional You did it follow-up is retained and played after the immediate phrase ends only if the same game is still in that won segment. Continue, Home, pause, mute, zero volume, restart and backgrounding discard it. This is one bounded follow-up, not a general speech queue.

The controller deduplicates by game/revision/event kind under StrictMode, drops obsolete lower-priority events, keeps one source, and guards end/error callbacks by identity. It does not replay restored events. Speech/effect callbacks cannot score, award progress, generate trays, change status or advance RNG. All spoken events and queues are transient.

Visual All Clear/round/burst labels and accessible score/line/status text remain with audio off. Occupancy labels do not depend on decorative tile hues, which change between themes. Screen-reader users can disable announcer voice independently. Native screen-reader overlap and audible loudness still need manual device inspection.

Unit and browser tests cover mapping, asynchronous voice discovery, source replacement, StrictMode, muted/zero-volume/missing support, pause/restart/refresh cancellation and the once-only All Clear → round-win follow-up. Browser scheduling tests use controlled speech doubles; they do not validate audible system voices.
