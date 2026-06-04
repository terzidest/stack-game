# CLAUDE.md — Stack

Guidance for working in this repository. Read this before changing code.
The thread model in **Architecture** is non-negotiable; most of the rules
exist to protect it.

---

## What this is

A single-screen "stack the blocks" mobile game. A block slides horizontally;
one tap drops it onto the tower. Overhang past the block below is sliced off,
so each block can get narrower; a drop aligned within a small tolerance is a
"perfect" (no shrink, plus a reward). The camera rises as the tower grows.

It is built as a **hand-rolled 2D game**, not on a game engine. That is a
deliberate choice: the scope is small, and the rendering/loop primitives are
ours to control. Do not introduce a game-engine dependency.

---

## Tech stack (pinned — treat as load-bearing)

| Package | Version | Role |
|---|---|---|
| expo | ~56.0.0 | App platform / build (EAS) |
| react-native | 0.85.3 | New Architecture (Fabric) enabled |
| react | 19.2.3 | — |
| @shopify/react-native-skia | 2.6.2 | GPU 2D rendering |
| react-native-reanimated | 4.3.1 | UI-thread game loop, shared values |
| react-native-worklets | 0.8.3 | Worklet runtime (Reanimated dep) |
| react-native-gesture-handler | ~2.31.1 | Tap input |
| typescript | ~6.0.3 | — |

Rules:

- **Skia and Reanimated are tightly coupled.** Do not bump one without
  checking compatibility with the other.
- **Verify APIs against the installed version before using a new one.** The
  Skia drawing surface inside worklets and the Reanimated shared-value API
  (`.modify`, `useFrameCallback`, `useDerivedValue`) move between releases.
  Read the installed package types/docs; do not assume from memory.
- Install native deps with `npx expo install`, never raw `npm install`, so
  versions stay aligned with the Expo SDK.

---

## Architecture — the thread model (READ THIS)

React Native runs two JS runtimes: the **JS thread** (React, business logic)
and the **UI thread** (Reanimated worklets, Skia rendering). The entire
per-frame game runs on the **UI thread**. Crossing back to the JS thread every
frame is the one mistake that destroys this game's performance.

The contract:

1. **All per-frame game state lives in one shared value** — the `World`
   object held in `useSharedValue`. It is mutated **only** inside
   `world.modify((w) => { ...; return w; })`, which runs on the UI thread and
   marks the value dirty.
   - **Never** mutate `world.value.someProp` directly. Reanimated does not
     observe property mutations and loses reactivity. Mutate inside
     `.modify()`, or replace the whole object with `world.value = next`.

2. **The game loop is a `useFrameCallback` worklet.** It computes delta time
   and calls `world.modify(updateWorld)`. There is **no `runOnJS` and no
   `setState` in the per-frame path.**

3. **Rendering is immediate-mode.** A Skia `Picture` is recorded inside a
   `useDerivedValue` worklet that reads `world.value`; when `.modify()` marks
   the world dirty, the picture re-records and `<Picture>` repaints — all on
   the UI thread. Immediate mode (not declarative components) is required
   because the number of draw commands per frame varies (growing tower,
   fluctuating debris).

4. **`runOnJS` is allowed only at tap frequency.** Phase transitions, pushing
   score/combo to the HUD, haptics, and sound run a handful of times per game,
   not per frame — those go through `runOnJS`.

5. **React state holds only the shell.** The phase (`idle | playing | over`)
   and display values (score, combo) live in React state and drive the
   overlays/HUD. Nothing that changes per frame belongs in React state.

6. **Everything that runs on the UI thread carries `"worklet"`.** All `domain/`
   and `render/` functions are worklets. If a function is called from inside a
   worklet, it must be one.

7. **Use delta time for all motion.** Movement, camera, decay, and physics are
   scaled by `dt` so the game runs identically at 60 Hz and 120 Hz, and is
   robust to frame-timing jitter.

---

## File structure

### Current state (what actually exists)

```
App.tsx                  # root component: phase/score/combo React state + wiring
assets/sfx/              # drop.mp3, perfect.mp3 (placeholders)
src/
  game/                  # simulation + rendering, all "worklet"
    types.ts               # World, Block, Current, Debris, Pulse, Phase, DropResult
    constants.ts           # tunable base values
    logic.ts               # freshWorld(), spawnCurrent(), updateWorld(), dropBlock()
    renderer.ts            # drawWorld() + drawBlock() + color helpers
    sound.ts               # useGameSounds() — expo-audio wrapper
  components/            # presentational React (no game logic)
    GameCanvas.tsx         # Canvas + useFrameCallback loop + gesture + Picture
    HUD.tsx                # score + combo badge
    Overlay.tsx            # idle / game-over screens
```

`App.tsx` and `assets/` are at the **repo root**, not under `src/`.

### Target structure (aspirational — grow into it, don't scaffold ahead)

As the game gains levels, difficulty, and persistence, split the flat `game/`
folder into domain-centric layers. Dependencies point **inward**: the pure
simulation at the center knows nothing about React, Skia, or Expo. **Do not
pre-create these files** — split `logic.ts` into `domain/{mechanics,scoring,…}`
when a file earns it, not before. Right-sized structure over speculative
scaffolding.

```
src/
  game/
    domain/          # PURE simulation. "worklet". No React/Skia/Expo imports.
      types.ts         # World, Block, Current, Debris, Pulse, Phase, DropResult
      world.ts         # freshWorld() + factories
      simulation.ts    # updateWorld() — per-frame integration
      mechanics.ts     # dropBlock(), overlap/slice, perfect detection
      scoring.ts       # combo + bonus rules
      levels.ts        # level definitions (data) + progression rules
      difficulty.ts    # speed / targets derived from level + score
      constants.ts     # tunable base values
    render/          # PURE drawing. "worklet". Reads World, never mutates it.
      renderer.ts      # drawWorld() orchestration
      theme.ts         # palette, hue ramp, color helpers
      effects.ts       # debris, pulses, squash, screen shake
    runtime/         # UI-thread + React glue (the only layer that imports both)
      GameCanvas.tsx   # Canvas + useFrameCallback loop + gesture + Picture
      hooks/           # useGameLoop, usePhaseMachine (extract as they grow)
    services/        # JS-thread side effects, invoked via runOnJS
      haptics.ts
      audio.ts
      storage.ts       # high scores, level progress
  ui/                # Presentational React. No game logic. (today: components/)
    HUD.tsx
    Overlay.tsx
```

Today's mapping onto the target: `logic.ts` → `domain/{world,simulation,mechanics}`,
`renderer.ts` → `render/{renderer,theme,effects}`, `sound.ts` → `services/audio.ts`,
`components/` → split between `runtime/` (GameCanvas) and `ui/` (HUD, Overlay).

**The golden rule:** `domain/` imports nothing from React, Skia, Expo,
`render/`, `runtime/`, or `services/`. If you need a platform thing in the
simulation, you've put it in the wrong layer.

Dependency direction:
`ui → runtime → { render, domain, services }`, `render → domain`,
`domain → (nothing)`, `services → (platform only)`.

---

## Engineering principles

- **Pure domain.** `domain/` functions are deterministic: given a `World` and
  `dt`, they mutate the world predictably with no I/O. Visual randomness
  (debris scatter, screen-shake jitter) lives in `render/effects.ts`, never in
  the simulation. Determinism keeps the sim testable, replayable, and tunable.
- **Renderer is read-only.** `render/` reads the world to draw; it never
  mutates it. State changes happen in `domain/` only.
- **Side effects at the edges.** Haptics, audio, and persistence live in
  `services/` and are triggered from the runtime layer via `runOnJS`. They
  never reach into the simulation.
- **Types as documentation.** Keep the `World` shape explicit and the source of
  truth in `domain/types.ts`. Prefer self-describing types over comments.
- **Tuning lives in data.** Magic numbers go in `constants.ts`; per-level
  tuning goes in `levels.ts`. Gameplay feel should be adjustable without
  touching logic.
- **No per-frame allocation on the hot path.** Hoist Skia `Paint`,
  `PictureRecorder`, and reusable `Color` objects to module scope; reuse them
  inside worklets. Allocating per frame creates GC churn on the render thread.

---

## Layer responsibilities

- **domain/** owns *what the game does*: movement, slicing, scoring, level
  progression, difficulty. Pure, worklet, platform-free.
- **render/** owns *what it looks like*: turning a `World` into Skia draw
  calls, plus visual effects. Worklet, no mutation.
- **runtime/** owns *wiring*: the shared-value world, the `useFrameCallback`
  loop, the `useDerivedValue` picture, the gesture, the phase machine, and the
  `runOnJS` bridges to React/services.
- **ui/** owns *the shell*: HUD and overlays driven by React state. No game
  logic, no Skia.
- **services/** owns *platform effects*: haptics, audio, storage.

---

## Adding features (worked examples)

These are the planned features; this is how they map onto the structure
without breaking the thread model.

### Levels with increasing difficulty

- `domain/levels.ts`: a data table of `Level` definitions — e.g. target block
  count to clear, base speed multiplier, perfect tolerance. Lower levels =
  fewer blocks and slower movement.
- `domain/types.ts`: add `level: number` (and any level progress) to `World`.
- `domain/difficulty.ts`: pure functions `speedFor(level, score)` and
  `targetFor(level)`. `spawnCurrent` and `updateWorld` read these instead of
  raw constants.
- `domain/mechanics.ts`: when the tower reaches the level target, set a
  level-complete flag on the world.
- Phase machine (`runtime/`): add a `"levelComplete"` phase; advance `level`
  and continue, or show a `ui/LevelComplete.tsx` overlay.
- `services/storage.ts`: persist highest level reached.

### Perfect-streak bonuses

- `domain/scoring.ts`: owns combo state and bonus rules — consecutive perfects
  increment `combo`; award bonus score scaled by streak; reset on any
  non-perfect.
- `domain/types.ts`: `combo: number` on `World` (already present).
- `render/effects.ts`: scale the perfect pulse/flash with `combo`.
- `runtime/`: push `combo` to React via `runOnJS` on each drop; `ui/HUD.tsx`
  shows a combo indicator at `combo >= 2`.

Both features are added by extending pure `domain/` modules and the renderer —
no change to the loop, the threading, or the rendering strategy.

---

## Definition of done

A change is done when:

- [ ] **Thread model intact** — no `setState` or `runOnJS` in the per-frame
      path; the world is mutated only inside `world.modify()`; `runOnJS` is
      used only at tap/transition frequency.
- [ ] **Worklets marked** — every function that runs on the UI thread (the
      simulation and renderer in `game/`, and their helpers) carries
      `"worklet"`.
- [ ] **Domain stays pure** — no React, Skia, or Expo imports in the
      simulation (`logic.ts` today; `domain/` once split). Layer dependency
      direction respected: the simulation depends on nothing.
- [ ] **Motion uses delta time** — all movement/decay/physics scaled by `dt`.
- [ ] **No per-frame allocation on the hot path** — Skia `Paint` /
      `PictureRecorder` / `Color` reused from module scope, not allocated per
      frame.
- [ ] **Tuning lives in data** — new constants in `constants.ts` (and
      `levels.ts` once it exists), not inline magic numbers.
- [ ] **Types updated** — `types.ts` reflects any new `World`/entity fields;
      no `any`.
- [ ] **Typecheck clean** — `npx tsc --noEmit` passes with no new errors.
- [ ] **APIs verified, not guessed** — any new Skia/Reanimated/Expo API checked
      against the installed version; native deps added via `npx expo install`,
      never raw `npm install`.
- [ ] **Domain logic is tested** — *once a test harness lands* (see Testing),
      new mechanics/scoring/level/difficulty functions get unit tests and the
      simulation stays deterministic for the same inputs. Until then, this is
      the standing TODO that unblocks the rest of this line.
- [ ] **Validated on device** — built via the EAS dev build and checked on real
      hardware (prefer a low-end Android); holds frame rate under a tall tower,
      and haptics/sound/feel behave as intended.

---

## Testing

`domain/` is pure and runs without React Native — unit-test it directly
(mechanics, scoring, level progression, difficulty curves). Given a `World`
and a sequence of `dt`/drops, assert the resulting state. This is the highest-
value testing surface; the runtime/render layers are best verified by playing.

---

## Commands

```bash
npx expo start            # dev server (use a development build; Skia needs native code)
npx tsc --noEmit          # typecheck
npx expo install <pkg>    # add a dependency (keeps SDK alignment)
eas build / eas submit    # cloud build + store submission
```

Skia is a native module, so testing on a device requires an **EAS development
build**, not Expo Go.
