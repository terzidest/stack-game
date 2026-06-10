import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  open: boolean;
  score: number;
  onResume: () => void;
  onRestart: () => void;
}

export default function PauseOverlay({
  open,
  score,
  onResume,
  onRestart,
}: Props) {
  if (!open) return null;

  return (
    // Full-screen interactive backdrop: captures touches so the game tap
    // underneath can't fire while paused. Tapping the backdrop resumes.
    <Pressable style={styles.backdrop} onPress={onResume}>
      {/* Stop propagation so taps inside the panel don't resume. */}
      <Pressable style={styles.panel} onPress={() => {}}>
        <Text style={styles.title}>PAUSED</Text>
        <Text style={styles.score}>Score: {score}</Text>

        <Pressable style={styles.primary} onPress={onResume}>
          <Text style={styles.primaryText}>Resume</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={onRestart}>
          <Text style={styles.secondaryText}>Restart</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(13, 15, 20, 0.92)",
  },
  panel: {
    width: "82%",
    maxWidth: 360,
    padding: 24,
    borderRadius: 20,
    backgroundColor: "#161a22",
    alignItems: "center",
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    letterSpacing: 5,
    color: "#fff",
  },
  score: {
    fontSize: 16,
    color: "#9aa3b8",
    marginBottom: 4,
  },
  primary: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0d0f14",
  },
  secondary: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2a2f3a",
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#e4e8f0",
  },
});
