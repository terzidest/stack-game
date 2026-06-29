import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Canvas, Picture, Skia } from "@shopify/react-native-skia";
import {
  useSharedValue,
  useFrameCallback,
  useDerivedValue,
} from "react-native-reanimated";
// runOnJS now lives in react-native-worklets; reanimated only re-exports it
// (deprecated). Same curried signature — call sites are unchanged.
import { runOnJS } from "react-native-worklets";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

import type { Phase } from "../game/types";
import type { DropResult } from "../game/logic";
import {
  freshWorld,
  spawnCurrent,
  updateWorld,
  dropBlock,
  screenTop,
} from "../game/logic";
import { drawWorld } from "../game/renderer";
import { useGameSounds } from "../game/sound";
import { isSoundEnabled, isHapticsEnabled } from "../services/settings";

// Reused across every frame — no per-frame allocation.
const _rec = Skia.PictureRecorder();

interface Props {
  phase: Phase;
  restartNonce: number;
  onPhaseChange: (phase: Phase) => void;
  onScoreChange: (score: number) => void;
  onComboChange: (combo: number) => void;
  onScorePop: (gain: number, x: number, y: number, perfect: boolean) => void;
  onGameOver: (score: number, blocks: number, streak: number) => void;
}

function triggerHapticJS(result: DropResult): void {
  if (!isHapticsEnabled()) return;
  if (result === "placed") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } else if (result === "perfect") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

export default function GameCanvas({
  phase,
  restartNonce,
  onPhaseChange,
  onScoreChange,
  onComboChange,
  onScorePop,
  onGameOver,
}: Props) {
  // Window dims seed the first frame, but the Canvas's measured layout is the
  // source of truth for drawing: on Android (edge-to-edge) the window height
  // excludes the navigation bar while the full-screen Canvas does not, so using
  // window dims leaves an unpainted strip below the tower. onLayout corrects it.
  const win = useWindowDimensions();
  const [size, setSize] = useState({ width: win.width, height: win.height });
  const W = size.width;
  const H = size.height;
  // The sky fills the full canvas (H, edge-to-edge), but gameplay anchors to a
  // floor above the Android nav bar: the measured canvas height exceeds the
  // window height by exactly the nav-bar inset, so the window height is the
  // visible floor. On iOS the two match and floorH === H.
  const floorH = Math.min(H, win.height);
  const onCanvasLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev.width === width && prev.height === height
        ? prev
        : { width, height }
    );
  }, []);
  const { playDrop, playPerfect } = useGameSounds();

  // All per-frame game state lives in a single shared value.
  const world = useSharedValue(freshWorld(W, floorH));
  const phaseRef = useSharedValue<Phase>("idle");

  // Sync React phase → worklet-readable shared value
  useEffect(() => {
    phaseRef.value = phase;
  }, [phase]);

  // Re-init world on dimension change
  useEffect(() => {
    if (phaseRef.value !== "playing") {
      world.value = freshWorld(W, floorH);
    }
  }, [W, floorH]);

  // Restart from a React button (pause overlay): reset the world to a fresh game
  // when the nonce bumps. Deps are [restartNonce] only so a resize never restarts;
  // W/H are read from the current render's closure.
  useEffect(() => {
    if (restartNonce > 0) {
      const w = freshWorld(W, floorH);
      spawnCurrent(w);
      world.value = w;
      phaseRef.value = "playing";
    }
  }, [restartNonce]);

  // Callbacks bridged to JS thread (only on tap, never per-frame)
  const setPhase = useCallback(
    (p: Phase) => onPhaseChange(p),
    [onPhaseChange]
  );
  const setScore = useCallback(
    (s: number) => onScoreChange(s),
    [onScoreChange]
  );
  const setCombo = useCallback(
    (c: number) => onComboChange(c),
    [onComboChange]
  );
  const spawnPop = useCallback(
    (gain: number, x: number, y: number, perfect: boolean) =>
      onScorePop(gain, x, y, perfect),
    [onScorePop]
  );

  const playSoundJS = useCallback(
    (result: DropResult) => {
      if (!isSoundEnabled()) return;
      if (result === "perfect") playPerfect();
      else if (result === "placed") playDrop();
    },
    [playDrop, playPerfect]
  );

  // ---- GAME LOOP (UI thread, every frame) ----
  const frameCallback = useCallback(
    (info: { timeSincePreviousFrame: number | null }) => {
      "worklet";
      if (phaseRef.value !== "playing") return;
      const dt = Math.min(50, info.timeSincePreviousFrame ?? 16);
      world.modify((w) => {
        "worklet";
        updateWorld(w, W, floorH, dt);
        return w;
      });
    },
    [W, floorH]
  );
  useFrameCallback(frameCallback);

  // ---- SKIA PICTURE (UI thread, re-recorded when world is marked dirty) ----
  const picture = useDerivedValue(() => {
    "worklet";
    const c = _rec.beginRecording(Skia.XYWHRect(0, 0, W, H));
    drawWorld(c, world.value, W, H, floorH);
    return _rec.finishRecordingAsPicture();
  }, [W, H, floorH]);

  // ---- TAP HANDLER (memoized) ----
  const tap = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        "worklet";
        if (phaseRef.value === "playing") {
          let result: DropResult = "miss";
          const prevScore = world.value.score;
          world.modify((w) => {
            "worklet";
            result = dropBlock(w, W, floorH);
            return w;
          }, true);

          // Stop the loop immediately on the UI thread (no JS hop needed).
          if (result === "miss") phaseRef.value = "over";

          // Feedback first — sound + haptic are latency-sensitive, so jump the
          // JS-thread queue ahead of the React state updates below.
          runOnJS(playSoundJS)(result);
          runOnJS(triggerHapticJS)(result);

          // A landed block throws a "+N" that flies into the sun. Spawn data is
          // derived here (tap frequency) from the just-placed block's position.
          if (result !== "miss") {
            const blocks = world.value.blocks;
            const top = blocks[blocks.length - 1];
            runOnJS(spawnPop)(
              world.value.score - prevScore,
              top.x + top.width / 2,
              screenTop(blocks.length - 1, world.value, floorH),
              result === "perfect"
            );
          }

          // Display/state updates can lag a frame without anyone noticing.
          runOnJS(setScore)(world.value.score);
          runOnJS(setCombo)(result === "miss" ? 0 : world.value.combo);
          if (result === "miss") {
            // Hand all final stats over in one call; App sets the "over" phase
            // alongside them so the game-over screen renders in one batch.
            runOnJS(onGameOver)(
              world.value.score,
              world.value.blocks.length - 1,
              world.value.maxCombo
            );
          }
        } else if (phaseRef.value === "idle") {
          // idle → start a new game on a tap anywhere. ("over" deliberately does
          // NOT start here — retry is the explicit button only, so spam-tapping
          // after a loss can't accidentally replay. "paused" resumes via its button.)
          const w = freshWorld(W, floorH);
          spawnCurrent(w);
          world.value = w;
          phaseRef.value = "playing";
          runOnJS(setPhase)("playing");
          runOnJS(setScore)(0);
          runOnJS(setCombo)(0);
        }
      }),
    [W, floorH, setPhase, setScore, setCombo, spawnPop, playSoundJS, onGameOver]
  );

  return (
    <GestureDetector gesture={tap}>
      <View style={styles.canvas} onLayout={onCanvasLayout}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Picture picture={picture} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: "#1d3f6e",
  },
});
