# ARCHITECTURE.md — Stack

The *why* behind the rules. `CLAUDE.md` states what to do; this explains the
reasoning and shows the data flow, so a regression is easy to recognize and
fix. If the two ever disagree, `CLAUDE.md` wins for day-to-day rules.

---

## 1. Two runtimes, one of which must own the game

React Native runs two JavaScript runtimes:

- **JS thread** — React, component tree, app logic, Expo/native module calls.
- **UI thread** — Reanimated worklets and Skia rendering, on the same thread
  the OS uses to composite frames.

A 60 Hz game has ~16 ms per frame. Hopping JS → UI → JS inside that budget, and
forcing React reconciliation each frame, is what makes a Skia/Reanimated game
stutter. So the entire per-frame simulation and render run on the **UI thread**,
and the JS thread is touched only at human-input frequency.

This is the single most important fact about the codebase. Most rules in
`CLAUDE.md` exist to keep this true. The **normative** statement of the thread
contract lives in `CLAUDE.md` (§Architecture); this section explains the
reasoning behind it. If they ever diverge, treat `CLAUDE.md` as authoritative
and fix this doc.

---

## 2. Data flow

```
  UI THREAD  — runs every frame, no JS-thread hop
  ┌─────────────────────────────────────────────────────────────┐
  │  useFrameCallback(dt) ──► world.modify(updateWorld)           │
  │                                   │                           │
  │                                   ▼                           │
  │                     World  (useSharedValue)                   │
  │                     the single source of per-frame truth      │
  │                                   │  read .value              │
  │                                   ▼                           │
  │                     useDerivedValue ──► record SkPicture      │
  │                                   │                           │
  │                                   ▼                           │
  │                     <Canvas><Picture/></Canvas> ──► GPU       │
  └─────────────────────────────────────────────────────────────┘

  TAP  — a few times per game
    Gesture.Tap (UI) ─► world.modify(dropBlock) ─► result
         │                                            │
         │                              runOnJS (JS thread):
         │                              setPhase / setScore / setCombo,
         │                              haptics, sound
         ▼                                            │
   phase guards the loop                              ▼
                                          React state ─► ui/ HUD + Overlay
```

`world.modify()` is the hinge: it mutates the world on the UI thread **and**
marks the shared value dirty, which is what makes `useDerivedValue` re-record
the picture. No dirty mark → no repaint.

---

## 3. Lifecycle of a frame

1. `useFrameCallback` fires on the UI thread with `timeSincePreviousFrame`.
2. If `phase !== "playing"`, return (loop idles cheaply between games).
3. Compute `dt` (clamped, so a backgrounded tab can't produce a huge step).
4. `world.modify((w) => { updateWorld(w, W, H, dt); return w; })` advances
   positions, camera, debris, decay — all scaled by `dt`.
5. The dirty mark triggers the `useDerivedValue` worklet, which re-records the
   `SkPicture` from the current world.
6. `<Picture>` repaints to the GPU. No React render occurred.

## 4. Lifecycle of a tap

1. `Gesture.Tap().onEnd` fires on the UI thread.
2. If playing: `world.modify((w) => { result = dropBlock(w, W, H); return w; })`
   — the slice/scoring mutation happens inside `modify`, and `result`
   (`perfect | placed | miss`) is captured via the closure.
3. `runOnJS` then syncs the JS thread: phase on a miss, score/combo to the HUD,
   and fires haptics + sound. These are tap-frequency, so the cost is fine.
4. If idle/over: build a fresh world, `spawnCurrent`, assign `world.value`, set
   phase to `playing`.

---

## 5. Why immediate-mode rendering

Skia offers two modes. **Retained mode** (declarative `<Rect>`, `<Group>`)
builds a display list from components and is ideal for animating a *fixed* set
of properties. **Immediate mode** (the `Picture` API) re-records a list of draw
commands each frame.

This game has a **variable number of draw commands per frame** — the tower
grows, debris appears and disappears. You can't bind declarative components to a
changing element count cleanly. So we record a `Picture` inside a
`useDerivedValue` worklet and render it via `<Picture>`. This also lets the
renderer stay a single imperative `drawWorld` function instead of a component
tree, which is simpler to reason about for a game.

---

## 6. State ownership

| State | Lives in | Thread | Changes |
|---|---|---|---|
| World (blocks, current, debris, pulses, camera, score, combo, shake) | `useSharedValue` | UI | every frame |
| Rendered picture | `useDerivedValue` | UI | every frame (derived) |
| Phase (`idle/playing/over`) | React state | JS | a few times per game |
| Display score / combo | React state | JS | per drop |
| Persisted high score / level | storage service | JS | per game end |

The world is the authority. React state is a *projection* of it for the shell,
pushed across via `runOnJS` at low frequency. Never the reverse — React never
drives per-frame world state.

---

## 7. The `runOnJS` budget

Allowed to cross to the JS thread:

- Phase transitions (start, game over, level complete).
- Pushing score/combo to the HUD on a drop.
- Haptics and sound on a drop / game over.
- Persistence on game end.

Not allowed:

- Anything inside `useFrameCallback` or the render worklet.
- Any per-frame state sync.

Rule of thumb: if it happens more than a few times per game, it does not cross.

---

## 8. Failure modes (symptom → cause → fix)

| Symptom | Likely cause | Fix |
|---|---|---|
| Animation stutters / frame drops as score climbs | `setState` or `runOnJS` in the per-frame path; per-frame Skia allocation | Remove JS-thread work from the loop; hoist Paint/Recorder to module scope |
| A dropped block doesn't appear / score doesn't update | Mutated `world.value` properties directly instead of inside `.modify()` | Do the mutation inside `world.modify(...)` |
| Picture never updates (frozen frame) | Derived value doesn't read `world.value`, or `.modify()` not called | Read `world.value` in the derived worklet; ensure the loop calls `.modify()` |
| `undefined is not a function` inside a worklet | A called function isn't a worklet | Add `"worklet"` to it (and its helpers) |
| Game speed differs across devices | Movement not scaled by `dt` | Multiply all motion by delta time |
| Reactivity lost after refactor | Destructured a shared value, or stored a function in one | Access via `.value`; never destructure or store worklets in shared values |

---

## 9. Performance model

- **UI-thread budget is ~16 ms/frame.** The simulation is cheap (a few dozen
  blocks, a handful of debris); the cost to watch is render-thread allocation.
- **No per-frame allocation on the hot path.** Reuse module-scope Skia `Paint`,
  `PictureRecorder`, and `Color` objects inside the worklets.
- **Low-end Android is the target to test**, not the newest iPhone. The model
  holds 60 fps on a near-empty scene almost regardless; the failure point is GC
  churn and JS-thread round-trips under load. Profile there.
- For dense effects later (large particle counts), use Skia's `Atlas` +
  `useRSXformBuffer` to draw many sprites in one call with transforms animated
  in a worklet — no per-frame JS objects.
