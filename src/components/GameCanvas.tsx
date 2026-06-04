import React, { useCallback, useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { Canvas, Picture, Skia } from "@shopify/react-native-skia";
import {
  useSharedValue,
  useFrameCallback,
  useDerivedValue,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import type { Phase } from "../game/types";
import {
  freshWorld,
  spawnCurrent,
  updateWorld,
  dropBlock,
} from "../game/logic";
import { drawWorld } from "../game/renderer";

interface Props {
  phase: Phase;
  onPhaseChange: (phase: Phase) => void;
  onScoreChange: (score: number) => void;
}

export default function GameCanvas({
  phase,
  onPhaseChange,
  onScoreChange,
}: Props) {
  const { width: W, height: H } = useWindowDimensions();

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

  // ---- GAME LOOP (UI thread, every frame) ----
  const frameCallback = useCallback(
    (info: { timeSincePreviousFrame: number | null }) => {
      "worklet";
      if (phaseRef.value !== "playing") return;
      const dt = Math.min(50, info.timeSincePreviousFrame ?? 16);
      // .modify() marks the shared value dirty so useDerivedValue re-runs
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
    const rec = Skia.PictureRecorder();
    const c = rec.beginRecording(Skia.XYWHRect(0, 0, W, H));
    drawWorld(c, world.value, W, H);
    return rec.finishRecordingAsPicture();
  }, [W, H]);

  // ---- TAP HANDLER (memoized) ----
  const tap = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        "worklet";
        if (phaseRef.value === "playing") {
          // Drop the current block. dropBlock mutates in place and returns
          // the result; .modify() then marks the shared value dirty.
          const result = dropBlock(world.value, W, H);
          world.modify((w) => {
            "worklet";
            return w;
          }, true);

          if (result === "miss") {
            phaseRef.value = "over";
            runOnJS(setPhase)("over");
            runOnJS(setScore)(world.value.score);
          } else {
            runOnJS(setScore)(world.value.score);
          }
        } else {
          // idle or over → start a new game
          const w = freshWorld(W, H);
          spawnCurrent(w);
          world.value = w;
          phaseRef.value = "playing";
          runOnJS(setPhase)("playing");
          runOnJS(setScore)(0);
        }
      }),
    [W, H, setPhase, setScore]
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
