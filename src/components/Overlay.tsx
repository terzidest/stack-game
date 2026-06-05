import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Phase } from "../game/types";

interface Props {
  phase: Phase;
  score: number;
  best: number;
  newRecord: boolean;
}

export default function Overlay({ phase, score, best, newRecord }: Props) {
  if (phase === "playing") return null;

  const isOver = phase === "over";

  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.title}>{isOver ? "GAME OVER" : "STACK"}</Text>
      <Text style={styles.subtitle}>
        {isOver
          ? `You stacked ${score} ${score === 1 ? "block" : "blocks"}.`
          : "Tap to drop a block.\nLine it up. Don't miss."}
      </Text>
      {isOver ? (
        newRecord ? (
          <Text style={styles.record}>★ New best — {score}</Text>
        ) : (
          <Text style={styles.best}>Best: {best}</Text>
        )
      ) : (
        best > 0 && <Text style={styles.best}>Best: {best}</Text>
      )}
      <View style={styles.cta}>
        <Text style={styles.ctaText}>
          {isOver ? "Tap to retry" : "Tap to start"}
        </Text>
      </View>
    </View>
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
    gap: 14,
    padding: 24,
    backgroundColor: "rgba(13, 15, 20, 0.85)",
  },
  title: {
    fontSize: 46,
    fontWeight: "500",
    letterSpacing: 6,
    color: "#fff",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: "#9aa3b8",
    textAlign: "center",
    maxWidth: 280,
  },
  best: {
    fontSize: 16,
    fontWeight: "500",
    color: "#9aa3b8",
    letterSpacing: 0.5,
  },
  record: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffd700",
    letterSpacing: 0.5,
  },
  cta: {
    marginTop: 6,
    paddingHorizontal: 26,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#0d0f14",
  },
});
