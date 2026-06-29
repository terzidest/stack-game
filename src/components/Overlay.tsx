import React, { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { Phase } from "../game/types";
import Sun, { sunFor } from "./Sun";
import PillButton from "./PillButton";
import { theme } from "./theme";

interface Props {
  phase: Phase;
  score: number;
  blocks: number;
  streak: number;
  best: number;
  newRecord: boolean;
  onRetry: () => void;
}

export default function Overlay({
  phase,
  score,
  blocks,
  streak,
  best,
  newRecord,
  onRetry,
}: Props) {
  // Mount-time fade + rise. The component only mounts on idle/over, so this fires
  // on each transition into a menu.
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const appear = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: t.value,
      transform: [{ translateY: interpolate(t.value, [0, 1], [12, 0]) }],
    };
  });

  // Only the start and game-over screens. Critically NOT "paused" — otherwise the
  // start menu would show behind the pause panel.
  if (phase !== "idle" && phase !== "over") return null;
  const isOver = phase === "over";

  return (
    // Over: capture taps (auto) so the only way to replay is the retry button.
    // Idle: let taps fall through (none) so tapping anywhere starts the game.
    <Animated.View
      style={[styles.container, appear]}
      pointerEvents={isOver ? "auto" : "none"}
    >
      {isOver ? (
        <>
          <Text style={styles.title}>GAME OVER</Text>
          <Sun size={140} {...sunFor(score)}>
            <Text style={styles.sunScore}>{score}</Text>
          </Sun>
          <Text style={styles.stat}>
            ★ {newRecord ? "New best" : "Best score"}: {best}
          </Text>
          {streak >= 1 && (
            <Text style={styles.stat}>★ Longest perfect streak: {streak}</Text>
          )}
          <Text style={styles.stat}>
            ★ Stacked {blocks} {blocks === 1 ? "block" : "blocks"}
          </Text>
          <PillButton label="Tap to retry" onPress={onRetry} />
        </>
      ) : (
        <>
          <Sun size={120} />
          <Text style={styles.title}>STACK</Text>
          <Text style={styles.subtitle}>
            Tap to drop a block.{"\n"}Line it up. Don't miss.
          </Text>
          {best > 0 && <Text style={styles.best}>Best score: {best}</Text>}
          <PillButton label="Tap to start" />
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 24,
    backgroundColor: theme.scrimSoft,
  },
  title: {
    fontSize: 46,
    fontWeight: "500",
    letterSpacing: 6,
    color: theme.text,
  },
  sunScore: {
    fontSize: 34,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.textSoft,
    textAlign: "center",
    maxWidth: 280,
  },
  // Game-over stat lines — shared gold + star treatment.
  stat: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.gold,
    letterSpacing: 0.3,
  },
  best: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.textSoft,
    letterSpacing: 0.5,
  },
});
