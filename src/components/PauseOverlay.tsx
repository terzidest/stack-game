import React from "react";
import { StyleSheet, Text } from "react-native";
import ModalCard from "./ModalCard";
import PillButton from "./PillButton";
import { theme } from "./theme";

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

  // Tapping the backdrop resumes.
  return (
    <ModalCard onBackdropPress={onResume}>
      <Text style={styles.title}>PAUSED</Text>
      <Text style={styles.score}>Score: {score}</Text>
      <PillButton variant="primary" label="Resume" onPress={onResume} stretch />
      <PillButton
        variant="secondary"
        label="Restart"
        onPress={onRestart}
        stretch
      />
    </ModalCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: "600",
    letterSpacing: 5,
    color: theme.text,
  },
  score: {
    fontSize: 16,
    color: theme.textSoft,
    marginBottom: 4,
  },
});
