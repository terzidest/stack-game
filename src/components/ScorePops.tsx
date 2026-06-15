import React, { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";

// Presentational tunables (UI flourish, not game tuning).
const DURATION = 750; // ms for a +N to travel from the block into the sun
const BOX_W = 60; // fixed text-box width; we translate by its half to center on a point
const BOX_HALF_H = 16; // ~half the line height, for vertical centering on a point

export interface ScorePopItem {
  id: number;
  gain: number;
  x: number; // spawn point (screen dp) — block center
  y: number;
  perfect: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface Props {
  items: ScorePopItem[];
  sun: Point; // convergence target — the sun's center
  onDone: (id: number) => void;
}

function ScorePop({
  item,
  sun,
  onDone,
}: {
  item: ScorePopItem;
  sun: Point;
  onDone: (id: number) => void;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: DURATION, easing: Easing.out(Easing.quad) },
      (finished) => {
        "worklet";
        if (finished) runOnJS(onDone)(item.id);
      }
    );
    // Run once on mount; the item is immutable for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => {
    "worklet";
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.6, 1], [1, 1, 0]), // fade as it nears the sun
      transform: [
        { translateX: interpolate(p, [0, 1], [item.x - BOX_W / 2, sun.x - BOX_W / 2]) },
        { translateY: interpolate(p, [0, 1], [item.y - BOX_HALF_H, sun.y - BOX_HALF_H]) },
        { scale: interpolate(p, [0, 1], [1, 0.7]) }, // shrink as it's "absorbed"
      ],
    };
  });

  return (
    <Animated.View style={[styles.pop, style]} pointerEvents="none">
      <Text style={[styles.text, item.perfect ? styles.perfect : styles.placed]}>
        +{item.gain}
      </Text>
    </Animated.View>
  );
}

export default function ScorePops({ items, sun, onDone }: Props) {
  return (
    <>
      {items.map((item) => (
        <ScorePop key={item.id} item={item} sun={sun} onDone={onDone} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  pop: {
    position: "absolute",
    top: 0,
    left: 0,
    width: BOX_W,
    alignItems: "center",
  },
  text: {
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  placed: {
    fontSize: 20,
    color: "#eaf2ff",
  },
  perfect: {
    fontSize: 26,
    color: "#ffd76e", // gold, matching the sun
  },
});
