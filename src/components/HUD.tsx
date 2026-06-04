import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Phase } from "../game/types";

interface Props {
  score: number;
  combo: number;
  phase: Phase;
}

export default function HUD({ score, combo, phase }: Props) {
  if (phase !== "playing") return null;
  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.score}>{score}</Text>
      {combo >= 2 && (
        <View style={styles.comboBadge}>
          <Text style={styles.comboText}>x{combo}</Text>
        </View>
      )}
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
    gap: 4,
  },
  score: {
    fontSize: 52,
    fontWeight: "500",
    color: "#fff",
    letterSpacing: -1,
  },
  comboBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.4)",
  },
  comboText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffd700",
    letterSpacing: 1,
  },
});
