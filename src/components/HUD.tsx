import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Phase } from "../game/types";

// Score past which the sun is at full brightness. Everything below ramps up.
const SUN_FULL_SCORE = 40;

// Sun geometry — exported so the +N popups can target the sun's center.
export const SUN_TOP_PAD = 44;
export const SUN_SIZE = 160;

interface Props {
  score: number;
  phase: Phase;
}

export default function HUD({ score, phase }: Props) {
  if (phase !== "playing") return null;

  // The sun brightens and swells as the score climbs. All of this is derived on
  // the JS thread at tap frequency (score only changes on a drop), so it never
  // touches the game loop.
  const t = Math.min(1, score / SUN_FULL_SCORE);
  const core = `hsl(45, 95%, ${52 + t * 16}%)`; // 52% → 68% lightness
  const glow = 0.16 + t * 0.34; // outer-ring opacity: 0.16 → 0.5

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.sun}>
        <View
          style={[
            styles.ring,
            styles.ringOuter,
            { opacity: glow * 0.5 },
          ]}
        />
        <View
          style={[styles.ring, styles.ringInner, { opacity: glow }]}
        />
        <View style={[styles.core, { backgroundColor: core }]}>
          <Text style={styles.score}>{score}</Text>
        </View>
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
    paddingTop: SUN_TOP_PAD,
    alignItems: "center",
    gap: 6,
  },
  sun: {
    width: SUN_SIZE,
    height: SUN_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  // Concentric translucent discs fake a soft bloom (no platform shadow needed).
  ring: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#ffd76e",
  },
  ringOuter: {
    width: 160,
    height: 160,
  },
  ringInner: {
    width: 124,
    height: 124,
  },
  core: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  score: {
    fontSize: 38,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: -1,
  },
});
