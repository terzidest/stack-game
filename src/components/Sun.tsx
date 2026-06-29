import React from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "./theme";

// Score at which the sun reaches full brightness. The HUD, start screen, and
// game-over screen all light the sun off this same ramp via sunFor().
export const SUN_FULL_SCORE = 40;

// Ring/core proportions, kept from the original inline HUD sun (160 / 124 / 92).
const INNER_RATIO = 124 / 160; // 0.775
const CORE_RATIO = 92 / 160; // 0.575

export function sunFor(score: number): { coreColor: string; glow: number } {
  const t = Math.min(1, score / SUN_FULL_SCORE);
  return {
    coreColor: `hsl(45, 95%, ${52 + t * 16}%)`, // 52% → 68% lightness
    glow: 0.16 + t * 0.34, // outer-ring opacity: 0.16 → 0.5
  };
}

interface Props {
  size: number;
  glow?: number; // 0–1, outer-ring opacity (defaults to full-bright)
  coreColor?: string;
  children?: React.ReactNode; // e.g. the score number
}

export default function Sun({
  size,
  glow = 0.5,
  coreColor = sunFor(SUN_FULL_SCORE).coreColor,
  children,
}: Props) {
  const inner = size * INNER_RATIO;
  const core = size * CORE_RATIO;
  return (
    <View
      style={[styles.sun, { width: size, height: size }]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.ring,
          { width: size, height: size, opacity: glow * 0.5 },
        ]}
      />
      <View
        style={[
          styles.ring,
          { width: inner, height: inner, opacity: glow },
        ]}
      />
      <View
        style={[
          styles.core,
          {
            width: core,
            height: core,
            borderRadius: core / 2,
            backgroundColor: coreColor,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sun: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Concentric translucent discs fake a soft bloom (no platform shadow needed).
  ring: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: theme.gold,
  },
  core: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
});
