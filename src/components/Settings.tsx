import React from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { Settings as SettingsState } from "../services/settings";

interface Props {
  open: boolean;
  settings: SettingsState;
  onClose: () => void;
  onToggleSound: (value: boolean) => void;
  onToggleHaptics: (value: boolean) => void;
}

export default function Settings({
  open,
  settings,
  onClose,
  onToggleSound,
  onToggleHaptics,
}: Props) {
  if (!open) return null;

  return (
    // Full-screen interactive backdrop: captures touches so the game tap
    // underneath can't fire while settings are open. Tapping the backdrop closes.
    <Pressable style={styles.backdrop} onPress={onClose}>
      {/* Stop propagation so taps inside the panel don't close it. */}
      <Pressable style={styles.panel} onPress={() => {}}>
        <Text style={styles.title}>SETTINGS</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Sound</Text>
          <Switch
            value={settings.sound}
            onValueChange={onToggleSound}
            trackColor={{ false: "#2a2f3a", true: "#4c8bf5" }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Haptics</Text>
          <Switch
            value={settings.haptics}
            onValueChange={onToggleHaptics}
            trackColor={{ false: "#2a2f3a", true: "#4c8bf5" }}
            thumbColor="#ffffff"
          />
        </View>

        <Pressable style={styles.cta} onPress={onClose}>
          <Text style={styles.ctaText}>Done</Text>
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
    gap: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: 4,
    color: "#fff",
    textAlign: "center",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  label: {
    fontSize: 17,
    color: "#e4e8f0",
  },
  cta: {
    marginTop: 8,
    alignSelf: "center",
    paddingHorizontal: 30,
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
