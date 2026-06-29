import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import type { Settings as SettingsState } from "../services/settings";
import ModalCard from "./ModalCard";
import PillButton from "./PillButton";
import { theme } from "./theme";

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

  // Tapping the backdrop closes.
  return (
    <ModalCard onBackdropPress={onClose}>
      <Text style={styles.title}>SETTINGS</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Sound</Text>
        <Switch
          value={settings.sound}
          onValueChange={onToggleSound}
          trackColor={{ false: theme.trackOff, true: theme.gold }}
          thumbColor="#ffffff"
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Haptics</Text>
        <Switch
          value={settings.haptics}
          onValueChange={onToggleHaptics}
          trackColor={{ false: theme.trackOff, true: theme.gold }}
          thumbColor="#ffffff"
        />
      </View>

      <PillButton variant="primary" label="Done" onPress={onClose} />
    </ModalCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: 4,
    color: theme.text,
    textAlign: "center",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    paddingVertical: 4,
  },
  label: {
    fontSize: 17,
    color: theme.text,
  },
});
