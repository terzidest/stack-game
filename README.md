# Stack

A single-screen "stack the blocks" mobile game. A block slides back and forth;
one tap drops it onto the tower. Any overhang past the block below is sliced
off — so the stack narrows as you go — and a drop aligned within a few pixels
is a **perfect**: no shrink, plus a flash and a combo. The camera rises as the
tower grows. Miss the block below entirely and it's game over.

Built as a **hand-rolled 2D game** (no game engine) on Expo + Skia +
Reanimated, with the entire per-frame simulation and rendering running on the
UI thread.

---

## Stack

| Package | Role |
|---|---|
| [Expo](https://expo.dev) (SDK 56) | App platform & build pipeline (EAS) |
| React Native 0.85 (New Architecture / Fabric) | Runtime |
| [@shopify/react-native-skia](https://shopify.github.io/react-native-skia/) | GPU 2D rendering |
| [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) | UI-thread game loop & shared values |
| [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) | Tap input |

---

## Getting started

```bash
npm install
npx expo start
```

> **Skia is a native module**, so the app cannot run in Expo Go. Use an **EAS
> development build** on a real device or simulator:
>
> ```bash
> npx expo install expo-dev-client
> eas build --profile development --platform ios   # or android
> ```

Other commands:

```bash
npx tsc --noEmit          # typecheck
npx expo install <pkg>    # add a dependency (keeps SDK alignment)
```

---

## How it works (the short version)

React Native runs two JS runtimes — a **JS thread** (React, app logic) and a
**UI thread** (Reanimated worklets, Skia). This game keeps the whole per-frame
loop on the UI thread and only crosses back to JS at tap frequency:

- All per-frame state lives in one `World` object held in a `useSharedValue`,
  mutated only inside `world.modify(...)` on the UI thread.
- The game loop is a `useFrameCallback` worklet that advances the world by
  delta time.
- Rendering is **immediate-mode**: a Skia `Picture` is re-recorded inside a
  `useDerivedValue` whenever the world is marked dirty.
- `runOnJS` is used only at tap frequency — phase changes, HUD score/combo,
  haptics, and sound.

The full reasoning, data-flow diagram, and failure modes are in
[ARCHITECTURE.md](ARCHITECTURE.md).

---

## Project structure

```
App.tsx              # root: phase/score/combo state + wiring
src/
  game/              # simulation + rendering (all worklets)
    types.ts           # World, Block, Current, Debris, Pulse, ...
    constants.ts       # tunable gameplay values
    logic.ts           # freshWorld, updateWorld, dropBlock
    renderer.ts        # drawWorld — immediate-mode Skia
    sound.ts           # expo-audio wrapper
  components/         # presentational React
    GameCanvas.tsx     # Canvas + loop + gesture + Picture
    HUD.tsx            # score + combo badge
    Overlay.tsx        # idle / game-over screens
assets/sfx/          # drop / perfect SFX
```

---

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — working agreement & conventions (the rules)
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — the *why*: thread model, data flow,
  failure modes
- **[ROADMAP.md](ROADMAP.md)** — phased plan from prototype to store launch

---

## Status

Core game and game-feel pass (squash, screen shake, perfect combos, haptics,
sound scaffolding) are complete. Next up: real sound assets, on-device
performance validation, persistence, and the store build pipeline. See
[ROADMAP.md](ROADMAP.md).
