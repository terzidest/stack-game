import React, { useCallback, useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
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
} from "../game/logic";
import { drawWorld } from "../game/renderer";
import { useGameSounds } from "../game/sound";
import { isSoundEnabled, isHapticsEnabled } from "../services/settings";

// Reused across every frame — no per-frame allocation.
const _rec = Skia.PictureRecorder();

interface Props {
  phase: Phase;
  onPhaseChange: (phase: Phase) => void;
  onScoreChange: (score: number) => void;
  onComboChange: (combo: number) => void;
  onGameOver: (score: number) => void;
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
  onPhaseChange,
  onScoreChange,
  onComboChange,
  onGameOver,
}: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const { playDrop, playPerfect } = useGameSounds();

  // All per-frame game state lives in a single shared value.
  const world = useSharedValue(freshWorld(W, H));
  const phaseRef = useSharedValue<Phase>("idle");

  // Sync React phase → worklet-readable shared value
  useEffect(() => {
    phaseRef.value = phase;
  }, [phase]);

  // Re-init world on dimension change
  useEffect(() => {
    if (phaseRef.value !== "playing") {
      world.value = freshWorld(W, H);
    }
  }, [W, H]);

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
        updateWorld(w, W, H, dt);
        return w;
      });
    },
    [W, H]
  );
  useFrameCallback(frameCallback);

  // ---- SKIA PICTURE (UI thread, re-recorded when world is marked dirty) ----
  const picture = useDerivedValue(() => {
    "worklet";
    const c = _rec.beginRecording(Skia.XYWHRect(0, 0, W, H));
    drawWorld(c, world.value, W, H);
    return _rec.finishRecordingAsPicture();
  }, [W, H]);

  // ---- TAP HANDLER (memoized) ----
  const tap = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        "worklet";
        if (phaseRef.value === "playing") {
          let result: DropResult = "miss";
          world.modify((w) => {
            "worklet";
            result = dropBlock(w, W, H);
            return w;
          }, true);

          // Stop the loop immediately on the UI thread (no JS hop needed).
          if (result === "miss") phaseRef.value = "over";

          // Feedback first — sound + haptic are latency-sensitive, so jump the
          // JS-thread queue ahead of the React state updates below.
          runOnJS(playSoundJS)(result);
          runOnJS(triggerHapticJS)(result);

          // Display/state updates can lag a frame without anyone noticing.
          runOnJS(setScore)(world.value.score);
          runOnJS(setCombo)(result === "miss" ? 0 : world.value.combo);
          if (result === "miss") {
            runOnJS(setPhase)("over");
            runOnJS(onGameOver)(world.value.score);
          }
        } else {
          // idle or over → start a new game
          const w = freshWorld(W, H);
          spawnCurrent(w);
          world.value = w;
          phaseRef.value = "playing";
          runOnJS(setPhase)("playing");
          runOnJS(setScore)(0);
          runOnJS(setCombo)(0);
        }
      }),
    [W, H, setPhase, setScore, setCombo, playSoundJS, onGameOver]
  );

  return (
    <GestureDetector gesture={tap}>
      <Canvas style={styles.canvas}>
        <Picture picture={picture} />
      </Canvas>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: "#0d0f14",
  },
});
