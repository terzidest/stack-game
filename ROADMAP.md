# ROADMAP.md — Stack

Phased plan from where the project is now to a published MVP on both app
stores. The MVP is a **polished single-mode stacker** — endless play, juice,
score persistence, and store compliance. Levels and expanded bonuses are
deliberately scoped as a **fast-follow after launch** to keep the first release
shippable. Phases are ordered; a few have hard external dependencies noted
under **Sequencing**.

Status legend: ✅ done · 🔄 in progress · ⬜ not started

---

## Phase 0 — Foundation ✅

The core game on the correct architecture.

- ✅ Expo (SDK 56) + Skia + Reanimated + Gesture Handler project
- ✅ Stack mechanic (slide, drop, slice, perfect, camera rise, debris)
- ✅ Phase state machine (idle / playing / over)
- ✅ UI-thread render loop: shared-value world, `useFrameCallback` +
  `.modify()`, immediate-mode `Picture` in `useDerivedValue`
- ✅ Project docs: `CLAUDE.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `README.md`
- ✅ Test harness: Jest (Node, no RN) with deterministic domain tests for
  `dropBlock` / `updateWorld`

**Exit:** game runs with no per-frame JS-thread work. *(met)*

---

## Phase 1 — Game feel 🔄

Make it feel like a finished product, not a prototype.

- ✅ Tap-handler correctness (drop inside `world.modify`, capture result)
- ✅ Landing squash, screen shake on miss, perfect-drop combo
- ✅ Haptics (`expo-haptics`) on drop / perfect / game over
- ✅ Sound layer (`expo-audio`) — drop + perfect SFX, crash-safe
- ✅ Allocation cleanup (hoist Skia `Paint` / `PictureRecorder` to module scope)
- ⬜ Real SFX files dropped into `assets/sfx/` (placeholders in place)
- ⬜ On-device feel + frame-profile verification (needs the EAS dev build)

**Exit:** drops feel tactile on a real device; clean frame profile under a tall
tower on a mid/low-end Android. *(code complete; pending hardware validation +
real SFX)*

---

## Phase 2 — Complete the loop ⬜

Everything a stranger needs to pick it up, replay, and come back.

- ⬜ Persistent high score + session best (`react-native-mmkv`)
- ⬜ Settings: sound and haptics toggles (store/accessibility expectation)
- ⬜ Pause / resume, clean restart flow
- ⬜ First-run nicety (the idle screen already covers most of this)
- ⬜ Difficulty tuning pass — speed ramp, perfect window, warm-up (playtested,
  not eyeballed)

**Exit:** a complete, satisfying, self-explanatory game loop.

---

## Phase 3 — App identity & build pipeline ⬜

Turn the project into installable, signed builds.

- 🔄 `app.json` / app config — name, slug, **portrait lock**, bundle id
  (`com.stack.game`) + Android package, version `1.0.0`, dark UI style all set;
  still need iOS `buildNumber` / Android `versionCode` for store builds
- ⬜ App icon + adaptive icon (Android) + splash screen
- ⬜ EAS project init; configure `eas.json` build profiles (dev / preview /
  production)
- ⬜ **EAS development build** installed on a real device (required — Skia is
  native, Expo Go won't run it). Validate haptics/sound on hardware here.

**Exit:** `eas build` produces installable signed binaries for both platforms.

---

## Phase 4 — Store compliance & assets ⬜

The paperwork and creative needed to list.

- ⬜ Apple Developer Program ($99/yr) + Google Play Developer ($25 one-time)
  accounts
- ⬜ Privacy policy URL (required even for a no-data game) + Apple privacy
  "nutrition" labels + Google Play Data Safety form
- ⬜ Age-rating questionnaires (both stores)
- ⬜ Store listing: title, short/long description, keywords
- ⬜ Screenshots for required device sizes; Google Play feature graphic
- ⬜ Confirm iOS build uses iOS 26 SDK+ (Expo 56 handles this) and current
  target-API requirements on Android

**Exit:** both store listings drafted; a production build is uploadable.

---

## Phase 5 — Testing & review ⬜

- ⬜ Apple: TestFlight internal/external testing
- ⬜ Google: **closed testing track** — personal developer accounts created
  after Nov 2023 must run a closed test with **at least 20 testers opted-in for
  14 continuous days** **before** production access is granted. Start this as
  early as Phase 3/4, not at the end. *(Re-verify the exact count/duration at
  submission — Google adjusts this.)*
- ⬜ Real-device bug triage; low-end Android performance check
- ⬜ Lightweight crash reporting (Sentry / Expo) wired in

**Exit:** clean builds pass review on both tracks; Google's closed-test gate
satisfied.

---

## Phase 6 — Launch (MVP) ⬜

- ⬜ Submit to production (`eas submit`)
- ⬜ Google Play staged/phased rollout; iOS phased release
- ⬜ Monitor crashes and first-session funnel
- ⬜ Tag the release; freeze the MVP scope

**Exit:** live on the App Store and Google Play. 🎉

---

## Post-MVP — fast-follow (v1.1+) ⬜

The features you care about, layered onto the existing structure (all land in
`domain/` + renderer per `CLAUDE.md` — no architecture change):

- ⬜ **Levels with increasing difficulty** — `domain/levels.ts` (per-level
  target block count, speed multiplier), `domain/difficulty.ts`, a
  `levelComplete` phase, `ui/LevelComplete.tsx`, persisted level progress.
  Lower levels = fewer blocks to clear and slower movement.
- ⬜ **Expanded bonuses** — richer perfect-streak scoring, near-miss recovery,
  combo milestones.
- ⬜ Daily challenge / seeded runs (the deterministic sim makes this cheap)
- ⬜ Platform leaderboards (Game Center / Play Games)
- ⬜ Themes / color skins
- ⬜ Analytics for retention tuning
- ⬜ Monetization *(optional)* — note: free with no IAP keeps the store path
  simplest and incurs no store commission

---

## Sequencing notes

- **Start Google's closed-testing track early.** It's time-gated and blocks
  production; treat it as a long-lead item from Phase 3 onward, not a final
  step.
- **Build the EAS dev build before finishing Phase 1.** Squash/shake feel and
  haptics can only be judged on hardware, and Skia needs a dev build to run on
  device at all.
- **Profile on low-end Android, early.** The architecture hides perf issues on
  fast hardware; the real signal is on a cheap device under a tall tower.
- **Store requirements drift.** Re-verify fees, SDK/target-API minimums, and
  testing rules at submission time rather than trusting this doc's snapshot.
