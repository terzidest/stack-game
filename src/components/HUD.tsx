import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Phase } from "../game/types";

interface Props {
  score: number;
  phase: Phase;
}

export default function HUD({ score, phase }: Props) {
  if (phase !== "playing") return null;
  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.score}>{score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    alignItems: "center",
  },
  score: {
    fontSize: 52,
    fontWeight: "500",
    color: "#fff",
    letterSpacing: -1,
  },
});
