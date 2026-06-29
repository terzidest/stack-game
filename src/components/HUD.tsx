import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Phase } from "../game/types";
import Sun, { sunFor } from "./Sun";

// Sun geometry — exported so the +N popups can target the sun's center.
export const SUN_TOP_PAD = 44;
export const SUN_SIZE = 160;

interface Props {
  score: number;
  phase: Phase;
}

export default function HUD({ score, phase }: Props) {
  if (phase !== "playing") return null;

  // The sun brightens and swells as the score climbs. Derived on the JS thread
  // at tap frequency (score only changes on a drop), so it never touches the loop.
  return (
    <View style={styles.container} pointerEvents="none">
      <Sun size={SUN_SIZE} {...sunFor(score)}>
        <Text style={styles.score}>{score}</Text>
      </Sun>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: SUN_TOP_PAD,
    alignItems: "center",
  },
  score: {
    fontSize: 38,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: -1,
  },
});
