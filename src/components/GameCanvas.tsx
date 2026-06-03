import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { Canvas, Picture, createPicture } from "@shopify/react-native-skia";
import type { SkPicture } from "@shopify/react-native-skia";
import { useFrameCallback, runOnJS } from "react-native-reanimated";
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

  // Mutable game state in a ref — mutated every frame, never triggers re-renders.
  const worldRef = useRef(freshWorld(W, H));
  const phaseRef = useRef<Phase>("idle");
  const lastT = useRef(performance.now());

  // Rendered picture (rendering artifact, not game state)
  const [pic, setPic] = useState<SkPicture>(() =>
    createPicture(
      (canvas) => drawWorld(canvas, freshWorld(W, H), W, H),
      { width: W, height: H }
    )
  );

  // Keep phaseRef in sync with React state
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Re-init on dimension changes
  useEffect(() => {
    if (phaseRef.current !== "playing") {
      worldRef.current = freshWorld(W, H);
      lastT.current = performance.now();
    }
  }, [W, H]);

  // ---- GAME TICK (runs on JS thread, called every frame) ----
  const tick = useCallback(() => {
    const now = performance.now();
    const dt = Math.min(50, now - lastT.current);
    lastT.current = now;

    if (phaseRef.current === "playing") {
      updateWorld(worldRef.current, W, H, dt);
    }

    setPic(
      createPicture(
        (canvas) => drawWorld(canvas, worldRef.current, W, H),
        { width: W, height: H }
      )
    );
  }, [W, H]);

  // ---- FRAME CALLBACK (UI-thread clock → bridges to JS tick) ----
  useFrameCallback(() => {
    "worklet";
    runOnJS(tick)();
  });

  // ---- TAP HANDLER ----
  const handleTap = useCallback(() => {
    if (phaseRef.current === "playing") {
      const result = dropBlock(worldRef.current, W, H);
      if (result === "miss") {
        phaseRef.current = "over";
        onPhaseChange("over");
        onScoreChange(worldRef.current.score);
      } else {
        onScoreChange(worldRef.current.score);
      }
    } else {
      // idle or over → start new game
      worldRef.current = freshWorld(W, H);
      spawnCurrent(worldRef.current);
      lastT.current = performance.now();
      phaseRef.current = "playing";
      onPhaseChange("playing");
      onScoreChange(0);
    }
  }, [W, H, onPhaseChange, onScoreChange]);

  const tap = Gesture.Tap().onEnd(() => {
    "worklet";
    runOnJS(handleTap)();
  });

  return (
    <GestureDetector gesture={tap}>
      <Canvas style={styles.canvas}>
        <Picture picture={pic} />
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
